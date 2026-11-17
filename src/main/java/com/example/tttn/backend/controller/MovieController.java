package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Movie;
import com.example.tttn.backend.service.AuthService;
import com.example.tttn.backend.service.MovieService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MovieController {

    private static final Logger logger = LoggerFactory.getLogger(MovieController.class);

    private final AuthService authService;
    private final JwtConfig jwtConfig;
    private final MovieService movieService;
    private final ObjectMapper objectMapper;

    @Autowired
    public MovieController(AuthService authService, JwtConfig jwtConfig, MovieService movieService, ObjectMapper objectMapper) {
        this.authService = authService;
        this.jwtConfig = jwtConfig;
        this.movieService = movieService;
        this.objectMapper = objectMapper;
    }

    // Lấy tất cả phim (GET all)
    @GetMapping("/movies")
    public ResponseEntity<?> getAllMovies(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            List<Movie> movies = movieService.getAllMovies(token);
            logger.info("Retrieved {} movies", movies.size());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", movies,
                    "message", "Retrieved all movies successfully"
            ));
        } catch (NotFoundException e) {
            logger.error("Error retrieving movies: {}", e.getMessage());
            return buildErrorResponse(HttpStatus.UNAUTHORIZED, e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error retrieving movies: {}", e.getMessage());
            return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }

    @GetMapping("/admin/movies")
    public ResponseEntity<?> getAllMoviesAdmin(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            List<Movie> movies = movieService.getAllMoviesAdmin(token);
            logger.info("Retrieved {} movies", movies.size());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", movies,
                    "message", "Retrieved all movies successfully"
            ));
        } catch (NotFoundException e) {
            logger.error("Error retrieving movies: {}", e.getMessage());
            return buildErrorResponse(HttpStatus.UNAUTHORIZED, e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error retrieving movies: {}", e.getMessage());
            return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }
    
    // Lấy phim theo ID (GET by ID)
    @GetMapping("/movies/{id}")
    public ResponseEntity<?> getMovieById(@PathVariable Long id,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            Movie movie = movieService.getMovieById(token, id);
            logger.info("Retrieved movie with ID: {}", id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", movie,
                    "message", "Retrieved movie successfully"
            ));
        } catch (NotFoundException e) {
            logger.error("Error retrieving movie with ID {}: {}", id, e.getMessage());
            return buildErrorResponse(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error retrieving movie with ID {}: {}", id, e.getMessage());
            return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }

    @GetMapping("/admin/movies/{id}")
    public ResponseEntity<?> getMovieByIdAdmin(@PathVariable Long id,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            Movie movie = movieService.getMovieByIdAdmin(token, id);
            logger.info("Retrieved movie with ID: {}", id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", movie,
                    "message", "Retrieved movie successfully"
            ));
        } catch (NotFoundException e) {
            logger.error("Error retrieving movie with ID {}: {}", id, e.getMessage());
            return buildErrorResponse(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error retrieving movie with ID {}: {}", id, e.getMessage());
            return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }

    // Tạo phim (POST)
    @PostMapping(value = "/admin/movies", consumes = {"multipart/form-data"})
    public ResponseEntity<?> createMovie(
            @RequestPart("movie") String movieJson,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            Movie movie = objectMapper.readValue(movieJson, Movie.class);
            Movie createdMovie = movieService.createMovie(token, movie, image);
            logger.info("Created movie with ID: {}", createdMovie.getId());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", createdMovie,
                    "message", "Movie created successfully"
            ));
        } catch (NotFoundException e) {
            logger.error("Error creating movie: {}", e.getMessage());
            return buildErrorResponse(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("Invalid movie data: {}", e.getMessage());
            return buildErrorResponse(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (IOException e) {
            logger.error("Error parsing movie JSON: {}", e.getMessage());
            return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid movie data format");
        } catch (Exception e) {
            logger.error("Unexpected error creating movie: {}", e.getMessage());
            return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }

    // Cập nhật phim (PUT)
    @PutMapping(value = "/admin/movies/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<?> updateMovie(
            @PathVariable Long id,
            @RequestPart("movie") String movieJson,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            Movie movieDetails = objectMapper.readValue(movieJson, Movie.class);
            Movie updatedMovie = movieService.updateMovie(token, id, movieDetails, image);
            logger.info("Updated movie with ID: {}", id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", updatedMovie,
                    "message", "Movie updated successfully"
            ));
        } catch (NotFoundException e) {
            logger.error("Error updating movie with ID {}: {}", id, e.getMessage());
            return buildErrorResponse(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("Invalid movie data for ID {}: {}", id, e.getMessage());
            return buildErrorResponse(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (IOException e) {
            logger.error("Error parsing movie JSON for ID {}: {}", id, e.getMessage());
            return buildErrorResponse(HttpStatus.BAD_REQUEST, "Invalid movie data format");
        } catch (Exception e) {
            logger.error("Unexpected error updating movie with ID {}: {}", id, e.getMessage());
            return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }

    // Xóa phim (DELETE)
    @DeleteMapping("/admin/movies/{id}")
    public ResponseEntity<?> deleteMovie(@PathVariable Long id,
                                        @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            movieService.deleteMovie(token, id);
            logger.info("Deleted movie with ID: {}", id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Movie deleted successfully"
            ));
        } catch (NotFoundException e) {
            logger.error("Error deleting movie with ID {}: {}", id, e.getMessage());
            return buildErrorResponse(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error deleting movie with ID {}: {}", id, e.getMessage());
            return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }

    // Lấy phim theo cinemaId
    @GetMapping("/admin/movies/cinema/{cinemaId}")
    public ResponseEntity<?> getMoviesByCinema(@PathVariable Long cinemaId,
                                              @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            List<Movie> movies = movieService.getMoviesByCinema(token, cinemaId);
            logger.info("Retrieved {} movies for cinema ID: {}", movies.size(), cinemaId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", movies,
                    "message", "Retrieved movies by cinema successfully"
            ));
        } catch (NotFoundException e) {
            logger.error("Error retrieving movies for cinema ID {}: {}", cinemaId, e.getMessage());
            return buildErrorResponse(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error retrieving movies for cinema ID {}: {}", cinemaId, e.getMessage());
            return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }

    // Lấy phim theo roomId
    @GetMapping("/admin/movies/room/{roomId}")
    public ResponseEntity<?> getMoviesByRoom(@PathVariable Long roomId,
                                            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            List<Movie> movies = movieService.getMoviesByRoom(token, roomId);
            logger.info("Retrieved {} movies for room ID: {}", movies.size(), roomId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", movies,
                    "message", "Retrieved movies by room successfully"
            ));
        } catch (NotFoundException e) {
            logger.error("Error retrieving movies for room ID {}: {}", roomId, e.getMessage());
            return buildErrorResponse(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error retrieving movies for room ID {}: {}", roomId, e.getMessage());
            return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }

    private String extractToken(String authHeader) {
        if (authHeader == null) {
            logger.error("Authorization header is missing");
            throw new NotFoundException("No token provided");
        }
        if (!authHeader.startsWith(JwtConfig.TOKEN_PREFIX)) {
            logger.error("Invalid token format: {}", authHeader);
            throw new NotFoundException("Token format invalid (missing Bearer)");
        }
        String token = authHeader.substring(JwtConfig.TOKEN_PREFIX.length()).trim();
        if (token.isEmpty()) {
            logger.error("Token is empty");
            throw new NotFoundException("Token is empty");
        }
        if (!jwtConfig.validateToken(token)) {
            logger.error("Invalid or expired token: {}", token);
            throw new NotFoundException("Token is invalid or expired");
        }
        return token;
    }

    private ResponseEntity<?> buildErrorResponse(HttpStatus status, String message) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("success", false);
        errorResponse.put("message", message);
        return new ResponseEntity<>(errorResponse, status);
    }
}