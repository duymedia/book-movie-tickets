package com.example.tttn.backend.service;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.*;
import com.example.tttn.backend.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private static final Logger logger = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepo;
    private final MovieRepository movieRepo;
    private final SeatRepository seatRepo;
    private final UserRepository userRepo;
    private final TicketRepository ticketRepo;
    private final ComboRepository comboRepo;
    private final CinemaRepository cinemaRepo;
    private final RoomRepository roomRepo;
    private final OrderRepository orderRepo;
    private final ShowtimeRepository showtimeRepo;
    private final AuthService authService;
    private final JwtConfig jwtConfig;
    private final ObjectMapper mapper;

    @Autowired
    public BookingService(BookingRepository bookingRepo, MovieRepository movieRepo, SeatRepository seatRepo,
                          UserRepository userRepo, TicketRepository ticketRepo, ComboRepository comboRepo,
                          CinemaRepository cinemaRepo, RoomRepository roomRepo, OrderRepository orderRepo,
                          ShowtimeRepository showtimeRepo, AuthService authService, JwtConfig jwtConfig, ObjectMapper mapper) {
        this.bookingRepo = bookingRepo;
        this.movieRepo = movieRepo;
        this.seatRepo = seatRepo;
        this.userRepo = userRepo;
        this.ticketRepo = ticketRepo;
        this.comboRepo = comboRepo;
        this.cinemaRepo = cinemaRepo;
        this.roomRepo = roomRepo;
        this.orderRepo = orderRepo;
        this.showtimeRepo = showtimeRepo;
        this.authService = authService;
        this.jwtConfig = jwtConfig;
        this.mapper = mapper;
    }

    @Transactional
    public Booking createBooking(String token, Booking booking) {
        
        checkInput(booking);

        User user = get(userRepo, booking.getUser().getId(), "người dùng");
        Cinema cinema = get(cinemaRepo, booking.getCinema().getId(), "rạp");
        Room room = get(roomRepo, booking.getRoom().getId(), "phòng");
        Movie movie = get(movieRepo, booking.getMovie().getId(), "phim");

        Map<Long, Integer> tickets = getTickets(booking, true);
        Map<Long, Boolean> seats = getSeats(booking, true);
        Map<Long, Integer> combos = getCombos(booking, false);
        Map<Long, Boolean> showtimes = getShowtimes(booking, true);
        checkMatch(tickets, seats);
        checkComboLimit(tickets, combos);

        List<Ticket> ticketList = fetchTickets(tickets.keySet());
        List<Seat> seatList = fetchSeats(seats.keySet());
        List<Showtime> showtimeList = fetchShowtimes(showtimes.keySet());
        List<Combo> comboList = combos != null && !combos.isEmpty() ? fetchCombos(combos.keySet()) : null;
        checkSeatAvail(seatList);
        checkConsistency(seatList, room, cinema, movie, showtimeList);
        if (comboList != null) {
            checkComboAvailability(comboList, combos);
            updateComboQuantities(comboList, combos);
        }

        double totalPrice = calcPrice(ticketList, tickets);
        if (comboList != null) {
            totalPrice += calcComboPrice(comboList, combos);
        }

        booking.setUser(user);
        booking.setCinema(cinema);
        booking.setRoom(room);
        booking.setMovie(movie);
        setSeatId(booking, seats);
        setTicketAmount(booking, tickets);
        setComboAmount(booking, combos);
        setShowtimeId(booking, showtimes);

        logger.info("Tạo booking: {}", booking);
        Booking saved = bookingRepo.save(booking);

        updateSeatStatus(seatList, "BOOKED");
        createOrder(saved, totalPrice);
        saveJson(saved, tickets, combos, showtimes, totalPrice);

        logger.info("Tạo booking ID: {}", saved.getId());
        return saved;
    }

    @Transactional
    public Booking updateBooking(String token, Long id, Booking details) {
        boolean isUser = authService.hasRole(token, "USER");
        boolean isAdmin = authService.hasRole(token, "ADMIN");

        if (!isUser && !isAdmin) {
            throw new NotFoundException("Chỉ USER hoặc ADMIN được cập nhật vé");
        }

        Booking booking = getBooking(id);
        if (!isAdmin) {
            throw new NotFoundException("Bạn không có quyền cập nhật");
        }

        Map<Long, Integer> tickets = getTickets(details, false);
        Map<Long, Boolean> seats = getSeats(details, false);
        Map<Long, Boolean> showtimes = getShowtimes(details, false);
        Double totalPrice = null;

        if (tickets != null && !tickets.isEmpty() && seats != null && !seats.isEmpty()) {
            checkMatch(tickets, seats);
            List<Ticket> ticketList = fetchTickets(tickets.keySet());
            List<Seat> newSeats = fetchSeats(seats.keySet());
            List<Showtime> showtimeList = showtimes != null && !showtimes.isEmpty() ? fetchShowtimes(showtimes.keySet()) : null;
            checkSeatAvail(newSeats);
            checkConsistency(newSeats, booking.getRoom(), booking.getCinema(), booking.getMovie(), showtimeList);

            setTicketAmount(booking, tickets);
            setSeatId(booking, seats);
            if (showtimes != null && !showtimes.isEmpty()) {
                setShowtimeId(booking, showtimes);
            }
            totalPrice = calcPrice(ticketList, tickets);

            Map<Long, Boolean> oldSeats = parseSeats(booking.getSeatId());
            updateSeatStatus(fetchSeats(oldSeats.keySet()), "AVAILABLE");
            updateSeatStatus(newSeats, "BOOKED");
        }

        updateFields(booking, details);
        logger.info("Cập nhật booking ID {}: {}", id, booking);
        Booking updated = bookingRepo.save(booking);

        saveJson(updated, tickets, null, showtimes, totalPrice);
        if (totalPrice != null) {
            updateOrder(updated.getId(), totalPrice);
        }

        logger.info("Cập nhật booking: {}", updated);
        return updated;
    }

    public List<Booking> getAllBookings(String token) {
        return bookingRepo.findAll();
    }

    public Booking getBookingById(String token, Long id) {
        return bookingRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy booking có id = " + id));
    }

    private <T> T get(JpaRepository<T, Long> repo, Long id, String name) {
        return repo.findById(id).orElseThrow(() -> new NotFoundException("Không thấy " + name + " ID: " + id));
    }

    private Booking getBooking(Long id) {
        return bookingRepo.findById(id).orElseThrow(() -> new NotFoundException("Không thấy booking ID: " + id));
    }

    private List<Ticket> fetchTickets(Set<Long> ids) {
        List<Ticket> tickets = ticketRepo.findAllById(ids);
        if (tickets.size() != ids.size()) throw new NotFoundException("Có vé không tồn tại");
        return tickets;
    }

    private List<Seat> fetchSeats(Set<Long> ids) {
        List<Seat> seats = seatRepo.findAllById(ids);
        if (seats.size() != ids.size()) throw new NotFoundException("Có ghế không tồn tại");
        return seats;
    }

    private List<Showtime> fetchShowtimes(Set<Long> ids) {
        List<Showtime> showtimes = showtimeRepo.findAllById(ids);
        if (showtimes.size() != ids.size()) throw new NotFoundException("Có lịch chiếu không tồn tại");
        return showtimes;
    }

    private void checkInput(Booking b) {
        if (b.getCinema() == null || b.getCinema().getId() == null) throw new IllegalArgumentException("Cần ID rạp");
        if (b.getRoom() == null || b.getRoom().getId() == null) throw new IllegalArgumentException("Cần ID phòng");
        if (b.getMovie() == null || b.getMovie().getId() == null) throw new IllegalArgumentException("Cần ID phim");
        if (b.getSeat() == null || b.getSeat().isEmpty()) throw new IllegalArgumentException("Cần danh sách ghế");
        if (b.getShowtimes() == null || b.getShowtimes().isEmpty()) throw new IllegalArgumentException("Cần danh sách lịch chiếu");
    }

    private void checkMatch(Map<Long, Integer> tickets, Map<Long, Boolean> seats) {
        int ticketCount = tickets.values().stream().mapToInt(Integer::intValue).sum();
        if (seats.size() != ticketCount) {
            throw new IllegalArgumentException("Số ghế (" + seats.size() + ") không khớp số vé (" + ticketCount + ")");
        }
    }

    private double calcPrice(List<Ticket> tickets, Map<Long, Integer> ticketMap) {
        double price = tickets.stream()
                .mapToDouble(t -> t.getPrice() * ticketMap.getOrDefault(t.getId(), 0))
                .sum();
        logger.info("Tổng giá vé: {}", price);
        return price;
    }

    private void checkSeatAvail(List<Seat> seats) {
        List<Booking> bookings = bookingRepo.findAll();
        StringBuilder bookedSeats = new StringBuilder();
        for (Booking b : bookings) {
            if ("COMPLETED".equals(b.getStatus()) && b.getSeatId() != null) {
                try {
                    Map<String, Boolean> existingSeats = mapper.readValue(b.getSeatId(), new TypeReference<>() {});
                    seats.forEach(s -> {
                        if (existingSeats.containsKey(s.getId().toString())) {
                            if (bookedSeats.length() > 0) bookedSeats.append(", ");
                            bookedSeats.append(s.getId());
                        }
                    });
                    if (bookedSeats.length() > 0) {
                        String errorMessage = "Ghế số " + bookedSeats.toString() + " đã được đặt trước đó. Vui lòng chọn ghế khác";
                        throw new NotFoundException(errorMessage);
                    }
                } catch (JsonProcessingException e) {
                    logger.error("Lỗi kiểm tra ghế ID {}: {}", b.getId(), e.getMessage());
                }
            }
        }
    }

    private void checkConsistency(List<Seat> seats, Room room, Cinema cinema, Movie movie, List<Showtime> showtimes) {
        seats.forEach(s -> {
            if (!s.getRoom().getId().equals(room.getId()))
                throw new IllegalArgumentException("Ghế " + s.getId() + " không thuộc phòng " + room.getId());
            if (!room.getCinema().getId().equals(cinema.getId()))
                throw new IllegalArgumentException("Phòng " + room.getId() + " không thuộc rạp " + cinema.getId());
        });

        if (showtimes != null) {
            showtimes.forEach(st -> {
                if (!st.getMovie().getId().equals(movie.getId()))
                    throw new IllegalArgumentException("Lịch chiếu " + st.getId() + " không thuộc phim " + movie.getId());
            });
        }
    }

    private void updateSeatStatus(List<Seat> seats, String status) {
        seats.forEach(s -> {
            s.setStatus(status);
            seatRepo.save(s);
        });
    }

    private void updateFields(Booking b, Booking details) {
        if (details.getMovie() != null && details.getMovie().getId() != null)
            b.setMovie(get(movieRepo, details.getMovie().getId(), "phim"));
        if (details.getCinema() != null && details.getCinema().getId() != null)
            b.setCinema(get(cinemaRepo, details.getCinema().getId(), "rạp"));
        if (details.getRoom() != null && details.getRoom().getId() != null)
            b.setRoom(get(roomRepo, details.getRoom().getId(), "phòng"));
        if (details.getStatus() != null && !details.getStatus().isEmpty())
            b.setStatus(details.getStatus());
    }

    private void setSeatId(Booking b, Map<Long, Boolean> seats) {
        try {
            b.setSeatId(seats != null && !seats.isEmpty() ? mapper.writeValueAsString(seats) : null);
        } catch (JsonProcessingException e) {
            logger.error("Lỗi lưu ghế: {}", e.getMessage());
            throw new IllegalArgumentException("Dữ liệu ghế sai");
        }
    }

    private void setTicketAmount(Booking b, Map<Long, Integer> tickets) {
        try {
            if (tickets != null && !tickets.isEmpty()) {
                Map<String, Boolean> ticketIds = tickets.keySet().stream()
                        .collect(Collectors.toMap(String::valueOf, id -> true));
                b.setTicketId(mapper.writeValueAsString(ticketIds));
                b.setAmount(mapper.writeValueAsString(tickets));
            } else {
                b.setTicketId(null);
                b.setAmount(null);
            }
        } catch (JsonProcessingException e) {
            logger.error("Lỗi lưu vé: {}", e.getMessage());
            throw new IllegalArgumentException("Dữ liệu vé sai");
        }
    }

    private void setComboAmount(Booking b, Map<Long, Integer> combos) {
        try {
            b.setComboId(combos != null && !combos.isEmpty() ? mapper.writeValueAsString(combos) : null);
        } catch (JsonProcessingException e) {
            logger.error("Lỗi lưu combo_id: {}", e.getMessage());
            throw new IllegalArgumentException("Dữ liệu combo sai");
        }
    }

    private void setShowtimeId(Booking b, Map<Long, Boolean> showtimes) {
        try {
            b.setShowtimeId(showtimes != null && !showtimes.isEmpty() ? mapper.writeValueAsString(showtimes) : null);
        } catch (JsonProcessingException e) {
            logger.error("Lỗi lưu lịch chiếu: {}", e.getMessage());
            throw new IllegalArgumentException("Dữ liệu lịch chiếu sai");
        }
    }

    private void createOrder(Booking b, double price) {
        Order order = new Order();
        order.setBooking(b);
        order.setTotalPrice(price);
        order.setStatus("PENDING");
        orderRepo.save(order);
        logger.info("Tạo đơn ID: {}", b.getId());
    }

    private void updateOrder(Long bookingId, double price) {
        Order order = orderRepo.findByBookingId(bookingId)
                .orElseThrow(() -> new NotFoundException("Không thấy đơn ID: " + bookingId));
        order.setTotalPrice(price);
        orderRepo.save(order);
        logger.info("Cập nhật đơn ID: {}", bookingId);
    }

    private Map<Long, Boolean> parseSeats(String seatId) {
        try {
            if (seatId == null || seatId.isEmpty()) return new HashMap<>();
            return mapper.readValue(seatId, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            logger.error("Lỗi đọc ghế: {}", e.getMessage());
            throw new IllegalStateException("Không đọc được ghế cũ");
        }
    }

    private Map<Long, Integer> getTickets(Booking b, boolean required) {
        try {
            Map<Long, Integer> tickets = b.getTicket();
            if (tickets == null || tickets.isEmpty()) {
                if (required) throw new IllegalArgumentException("Cần danh sách vé");
                return null;
            }
            tickets.forEach((k, v) -> {
                if (k == null || v == null || v <= 0) throw new IllegalArgumentException("Vé không hợp lệ");
            });
            return tickets;
        } catch (Exception e) {
            logger.error("Lỗi xử lý vé: {}", e.getMessage());
            throw new IllegalArgumentException("Dữ liệu vé sai");
        }
    }

    private Map<Long, Boolean> getSeats(Booking b, boolean required) {
        try {
            Map<Long, Boolean> seats = b.getSeat();
            if (seats == null || seats.isEmpty()) {
                if (required) throw new IllegalArgumentException("Cần danh sách ghế");
                return null;
            }
            seats.forEach((k, v) -> {
                if (k == null || v == null) throw new IllegalArgumentException("Ghế không hợp lệ");
            });
            return seats;
        } catch (Exception e) {
            logger.error("Lỗi xử lý ghế: {}", e.getMessage());
            throw new IllegalArgumentException("Dữ liệu ghế sai");
        }
    }

    private Map<Long, Integer> getCombos(Booking b, boolean required) {
        try {
            Map<Long, Integer> combos = b.getCombos();
            if ((combos == null || combos.isEmpty()) && !required) {
                try {
                    String json = mapper.writeValueAsString(b);
                    Map<String, Object> data = mapper.readValue(json, new TypeReference<>() {});
                    Object comboObj = data.get("combo");
                    if (comboObj != null) {
                        combos = mapper.convertValue(comboObj, new TypeReference<>() {});
                    }
                } catch (JsonProcessingException e) {
                    logger.warn("Không thể parse combo từ JSON: {}", e.getMessage());
                }
            }
            if (combos == null || combos.isEmpty()) {
                if (required) throw new IllegalArgumentException("Cần danh sách combo");
                return null;
            }
            combos.forEach((k, v) -> {
                if (k == null || v == null || v <= 0) throw new IllegalArgumentException("Combo không hợp lệ");
            });
            return combos;
        } catch (Exception e) {
            logger.error("Lỗi xử lý combo: {}", e.getMessage());
            throw new IllegalArgumentException("Dữ liệu combo sai");
        }
    }

    private Map<Long, Boolean> getShowtimes(Booking b, boolean required) {
        try {
            Map<Long, Boolean> showtimes = b.getShowtimes();
            if (showtimes == null || showtimes.isEmpty()) {
                if (required) throw new IllegalArgumentException("Cần danh sách lịch chiếu");
                return null;
            }
            showtimes.forEach((k, v) -> {
                if (k == null || v == null) throw new IllegalArgumentException("Lịch chiếu không hợp lệ");
            });
            return showtimes;
        } catch (Exception e) {
            logger.error("Lỗi xử lý lịch chiếu: {}", e.getMessage());
            throw new IllegalArgumentException("Dữ liệu lịch chiếu sai");
        }
    }

    private List<Combo> fetchCombos(Set<Long> ids) {
        List<Combo> combos = comboRepo.findAllById(ids);
        if (combos.size() != ids.size()) throw new NotFoundException("Có combo không tồn tại");
        return combos;
    }

    private void checkComboAvailability(List<Combo> combos, Map<Long, Integer> comboMap) {
        combos.forEach(combo -> {
            int requestedQuantity = comboMap.get(combo.getId());
            if (combo.getQuantity() < requestedQuantity) {
                throw new IllegalArgumentException(
                        String.format("Combo %s không đủ số lượng (yêu cầu: %d, còn: %d)",
                                combo.getName(), requestedQuantity, combo.getQuantity()));
            }
        });
    }

    private void checkComboLimit(Map<Long, Integer> tickets, Map<Long, Integer> combos) {
        if (combos == null || combos.isEmpty()) {
            return;
        }
        int ticketCount = tickets.values().stream()
                .filter(quantity -> quantity != null)
                .mapToInt(Integer::intValue)
                .sum();
        int comboCount = combos.values().stream()
                .filter(quantity -> quantity != null)
                .mapToInt(Integer::intValue)
                .sum();
        int maxCombos = ticketCount * 2;
        if (comboCount > maxCombos) {
            throw new IllegalArgumentException(
                    String.format("Tổng số combo (%d) vượt quá giới hạn (%d)", comboCount, maxCombos));
        }
    }

    private double calcComboPrice(List<Combo> combos, Map<Long, Integer> comboMap) {
        double price = combos.stream()
                .mapToDouble(c -> c.getPrice() * comboMap.getOrDefault(c.getId(), 0))
                .sum();
        logger.info("Tổng giá combo: {}", price);
        return price;
    }

    private void updateComboQuantities(List<Combo> combos, Map<Long, Integer> comboMap) {
        combos.forEach(combo -> {
            int requestedQuantity = comboMap.get(combo.getId());
            int newQuantity = combo.getQuantity() - requestedQuantity;
            if (newQuantity < 0) {
                throw new IllegalStateException(
                        String.format("Combo %s có số lượng âm sau khi cập nhật (hiện tại: %d, yêu cầu: %d)",
                                combo.getName(), combo.getQuantity(), requestedQuantity));
            }
            combo.setQuantity(newQuantity);
            comboRepo.save(combo);
            logger.info("Cập nhật số lượng combo ID {}: còn lại {}", combo.getId(), newQuantity);
        });
    }

    private void saveJson(Booking b, Map<Long, Integer> tickets, Map<Long, Integer> combos, Map<Long, Boolean> showtimes, Double price) {
        try {
            Map<String, Object> data = new HashMap<>();
            if (tickets != null && !tickets.isEmpty()) {
                data.put("ticket", tickets);
            }
            if (combos != null && !combos.isEmpty()) {
                data.put("combos", combos);
            }
            if (showtimes != null && !showtimes.isEmpty()) {
                data.put("showtimes", showtimes);
            }
            if (price != null) {
                data.put("totalPrice", price);
            }
            b.setDataJson(data.isEmpty() ? null : mapper.writeValueAsString(data));
        } catch (JsonProcessingException e) {
            logger.error("Lỗi lưu JSON: {}", e.getMessage());
            throw new IllegalStateException("Không lưu được JSON");
        }
    }
}