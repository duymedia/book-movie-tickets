import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Users,
  Film,
  Ticket,
  DollarSign,
  Calendar,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Clock,
  MapPin,
  Play,
  MoreHorizontal,
  Activity,
  Target,
  Zap,
} from "lucide-react";

// Minimal AdminLayout placeholder
const AdminLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 p-4 shadow">
        <h1 className="text-xl font-bold">Cinema Admin</h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
};

function Dashboard() {
  const [stats, setStats] = useState([]);
  const [recentMovies, setRecentMovies] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Helper function to calculate percentage change
  const calculateChange = (current, previous) => {
    if (previous === 0) return "+0%";
    const change = ((current - previous) / previous) * 100;
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("No authentication token found. Please log in.");
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // Fetch users
        const usersResponse = await fetch("http://localhost:8080/api/users", { headers });
        if (!usersResponse.ok) {
          const errorText = await usersResponse.text();
          throw new Error(`Failed to fetch users: ${usersResponse.status} ${errorText}`);
        }
        const usersData = await usersResponse.json();
        const users = Array.isArray(usersData) ? usersData : [];

        // Fetch orders
        let orders = [];
        try {
          const ordersResponse = await fetch("http://localhost:8080/api/orders", { headers });
          if (!ordersResponse.ok) {
            console.warn(`Failed to fetch orders: ${ordersResponse.status}`);
          } else {
            orders = await ordersResponse.json();
            orders = Array.isArray(orders) ? orders : orders.data || [];
          }
        } catch (err) {
          console.warn("Orders API not available:", err.message);
        }

        // Fetch movies
        let movies = [];
        try {
          const moviesResponse = await fetch("http://localhost:8080/api/movies", { headers });
          if (!moviesResponse.ok) {
            console.warn(`Failed to fetch movies: ${moviesResponse.status}`);
          } else {
            movies = await moviesResponse.json();
            movies = Array.isArray(movies) ? movies : movies.data || [];
          }
        } catch (err) {
          console.warn("Movies API not available:", err.message);
        }

        // Log responses for debugging
        console.log("Users:", users);
        console.log("Orders:", orders);
        console.log("Movies:", movies);

        // Compute stats
        // Chỉ đếm users không phải ADMIN
        const totalUsers = users.filter(user => user.role !== "ADMIN").length;
        const totalMovies = movies.length;
        const totalOrders = orders.filter((order) => order.status === "COMPLETED").length;
        const totalRevenue = orders
          .filter((order) => order.status === "COMPLETED")
          .reduce((sum, order) => sum + (order.totalPrice || 0), 0);

        // Mock previous data for change calculation
        const previousUsers = 2500;
        const previousMovies = 20;
        const previousOrders = 1100;
        const previousRevenue = 40000000;

        setStats([
          {
            title: "Tổng thành viên",
            value: totalUsers.toLocaleString(),
            change: calculateChange(totalUsers, previousUsers),
            changeType: totalUsers >= previousUsers ? "increase" : "decrease",
            icon: Users,
            color: "from-blue-500 to-cyan-500",
            bgColor: "from-blue-50 to-cyan-50",
            darkBgColor: "from-blue-900/20 to-cyan-900/20",
            description: `Tăng ${totalUsers - previousUsers} thành viên mới`,
          },
          {
            title: "Phim đang chiếu",
            value: totalMovies.toString(),
            change: calculateChange(totalMovies, previousMovies),
            changeType: totalMovies >= previousMovies ? "increase" : "decrease",
            icon: Film,
            color: "from-purple-500 to-pink-500",
            bgColor: "from-purple-50 to-pink-50",
            darkBgColor: "from-purple-900/20 to-pink-900/20",
            description: `${totalMovies - previousMovies} phim mới ra mắt`,
          },
          {
            title: "Vé đã bán",
            value: totalOrders.toLocaleString(),
            change: calculateChange(totalOrders, previousOrders),
            changeType: totalOrders >= previousOrders ? "increase" : "decrease",
            icon: Ticket,
            color: "from-green-500 to-emerald-500",
            bgColor: "from-green-50 to-emerald-50",
            darkBgColor: "from-green-900/20 to-emerald-900/20",
            description: `Hôm nay bán ${totalOrders} vé`,
          },
          {
            title: "Doanh thu",
            value: formatCurrency(totalRevenue),
            change: calculateChange(totalRevenue, previousRevenue),
            changeType: totalRevenue >= previousRevenue ? "increase" : "decrease",
            icon: DollarSign,
            color: "from-orange-500 to-red-500",
            bgColor: "from-orange-50 to-red-50",
            darkBgColor: "from-orange-900/20 to-red-900/20",
            description: `Tháng này tăng ${calculateChange(totalRevenue, previousRevenue)}`,
          },
        ]);

        // Compute recent movies
        const movieStats = movies.map((movie) => {
          const movieOrders = orders.filter(
            (order) =>
              order.status === "COMPLETED" &&
              order.booking?.showtime?.movie?.id === movie.id
          );
          const revenue = movieOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
          const showings = movie.showtimes ? movie.showtimes.length : 0;
          const occupancy = movieOrders.length
            ? (movieOrders.length / (showings * 50)) * 100
            : 0;
          const rating = 4.5 + Math.random() * 0.5;

          return {
            title: movie.title || "Unknown Movie",
            rating: rating.toFixed(1),
            showings,
            revenue: formatCurrency(revenue),
            status: revenue > 2000000 ? "hot" : revenue > 1500000 ? "trending" : "normal",
            image: movie.image || "/placeholder.svg?height=60&width=40",
            occupancy: Math.min(occupancy.toFixed(0), 100),
          };
        });

        setRecentMovies(
          movieStats
            .sort((a, b) => parseFloat(b.revenue.replace(/[^0-9]/g, "")) - parseFloat(a.revenue.replace(/[^0-9]/g, "")))
            .slice(0, 4)
        );

        // Compute recent orders
        setRecentOrders(
          orders
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 4)
            .map((order) => ({
              id: `#${order.id || "N/A"}`,
              customer: order.booking?.user?.name || "Unknown",
              movie: order.booking?.showtime?.movie?.title || "Unknown Movie",
              amount: formatCurrency(order.totalPrice || 0),
              status: (order.status || "unknown").toLowerCase(),
              time: order.createdAt
                ? `${Math.floor((Date.now() - new Date(order.createdAt)) / 60000)} phút trước`
                : "N/A",
              avatar: order.booking?.user?.name
                ? order.booking.user.name.slice(0, 2).toUpperCase()
                : "NA",
              seats: order.booking?.seats?.join(", ") || "N/A",
            }))
        );

        // Compute recent activities
        setRecentActivities(
          orders
            .slice(0, 2)
            .map((order, index) => ({
              title: "Đặt vé xem phim",
              description: `${order.booking?.user?.name || "User"} đã đặt vé xem phim ${order.booking?.showtime?.movie?.title || "Movie"}`,
              time: `${2 + index * 3} phút trước`,
            }))
            .concat(
              users.length > 0
                ? [
                    {
                      title: "Thành viên mới",
                      description: `${users[users.length - 1].name} đã đăng ký tài khoản`,
                      time: "5 phút trước",
                    },
                  ]
                : []
            )
            .concat(
              movies.length > 0
                ? [
                    {
                      title: "Bình luận mới",
                      description: `${users[0]?.name || "User"} đã bình luận về phim ${movies[0]?.title || "Movie"}`,
                      time: "15 phút trước",
                    },
                  ]
                : []
            )
        );

        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const quickActions = [
    {
      title: "Thêm phim mới",
      description: "Thêm phim vào hệ thống",
      icon: Film,
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      darkBgColor: "from-blue-900/20 to-blue-800/20",
    },
    {
      title: "Lập lịch chiếu",
      description: "Tạo suất chiếu mới",
      icon: Calendar,
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      darkBgColor: "from-green-900/20 to-green-800/20",
    },
    {
      title: "Quản lý thành viên",
      description: "Xem danh sách thành viên",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      darkBgColor: "from-purple-900/20 to-purple-800/20",
    },
    {
      title: "Báo cáo doanh thu",
      description: "Xem thống kê chi tiết",
      icon: DollarSign,
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
      darkBgColor: "from-orange-900/20 to-orange-800/20",
    },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case "hot":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">🔥 Hot</Badge>;
      case "trending":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
            📈 Trending
          </Badge>
        );
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Hoàn thành</Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Đang xử lý</Badge>
        );
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Đã hủy</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center p-6">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        <p>Lỗi: {error}</p>
        <p>Vui lòng kiểm tra server tại http://localhost:8080, đảm bảo token hợp lệ, và thử lại.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 xl:space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl xl:rounded-3xl p-6 xl:p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl xl:text-3xl font-bold mb-2">Chào mừng trở lại! 👋</h1>
            <p className="text-blue-100 text-base xl:text-lg">Tổng quan hệ thống quản lý rạp chiếu phim hôm nay</p>
          </div>
          <div className="mt-4 lg:mt-0 text-right">
            <p className="text-blue-100">Hôm nay</p>
            <p className="text-xl xl:text-2xl font-bold">{new Date().toLocaleDateString("vi-VN")}</p>
            <div className="flex items-center justify-end mt-2">
              <Activity className="h-4 w-4 mr-1" />
              <span className="text-sm">Hệ thống hoạt động bình thường</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} dark:${stat.darkBgColor} opacity-50`}
              />
              <CardContent className="relative p-4 xl:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{stat.title}</p>
                    <p className="text-2xl xl:text-3xl font-bold text-slate-900 dark:text-white mb-2">{stat.value}</p>
                    <div className="flex items-center mb-2">
                      {stat.changeType === "increase" ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          stat.changeType === "increase"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{stat.description}</p>
                  </div>
                  <div
                    className={`p-3 xl:p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-200`}
                  >
                    <Icon className="h-6 w-6 xl:h-8 xl:w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Movies and Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
        <Card className="xl:col-span-2 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-slate-800 dark:text-white">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mr-3">
                  <Film className="h-5 w-5 text-white" />
                </div>
                Phim có doanh thu cao nhất
              </CardTitle>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 xl:p-6">
            <div className="space-y-4">
              {recentMovies.length > 0 ? (
                recentMovies.map((movie, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl hover:shadow-md transition-all duration-200"
                  >
                    <div className="relative">
                      <img
                        src={movie.image}
                        alt={movie.title}
                        className="w-12 h-16 xl:w-14 xl:h-20 object-cover rounded-lg shadow-md"
                      />
                      <div className="absolute -top-2 -right-2">{getStatusBadge(movie.status)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-1 truncate pr-2">{movie.title}</h4>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                          {movie.revenue}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                          <span>{movie.rating}</span>
                        </div>
                        <div className="flex items-center">
                          <Play className="h-4 w-4 mr-1" />
                          <span>{movie.showings} suất chiếu</span>
                        </div>
                        <div className="flex items-center">
                          <Target className="h-4 w-4 mr-1" />
                          <span>{movie.occupancy}% lấp đầy</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Tỷ lệ lấp đầy</span>
                          <span>{movie.occupancy}%</span>
                        </div>
                        <Progress value={movie.occupancy} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500">Không có dữ liệu phim.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-slate-800 dark:text-white">
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg mr-3">
                  <Ticket className="h-5 w-5 text-white" />
                </div>
                Đơn hàng gần đây
              </CardTitle>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 xl:p-6">
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order, index) => (
                  <div
                    key={index}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {order.avatar}
                        </div>
                        <div>
                          <span className="font-medium text-slate-900 dark:text-white text-sm">{order.id}</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{order.customer}</p>
                        </div>
                      </div>
                      {getOrderStatusBadge(order.status)}
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                        <Film className="h-3 w-3 mr-2" />
                        <span className="truncate">{order.movie}</span>
                      </div>
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="h-3 w-3 mr-2" />
                        <span>Ghế: {order.seats}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">{order.amount}</span>
                      <div className="flex items-center text-xs text-slate-400">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{order.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500">Không có đơn hàng gần đây.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
          <CardTitle className="text-slate-800 dark:text-white flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Thao tác nhanh
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 xl:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  className="group p-4 xl:p-6 text-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 hover:from-slate-50 hover:to-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-600 rounded-xl transition-all duration-300 hover:shadow-lg border border-slate-200 dark:border-slate-600"
                >
                  <div
                    className={`w-12 h-12 xl:w-14 xl:h-14 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200 shadow-lg`}
                  >
                    <Icon className="h-6 w-6 xl:h-7 xl:w-7 text-white" />
                  </div>
                  <p className="text-sm xl:text-base font-semibold text-slate-900 dark:text-white mb-1">
                    {action.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;