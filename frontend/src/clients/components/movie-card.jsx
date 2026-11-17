import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Star, Clock, Eye, Heart, Calendar, Bookmark } from "lucide-react"
import { useState } from "react"
import { cn } from "../lib/utils"
import "../../globals.css"

/**
 * @typedef {Object} Movie
 * @property {number} id
 * @property {string} title
 * @property {number} rating
 * @property {string} duration
 * @property {string} genre
 * @property {string} image
 * @property {string[]=} showtimes
 * @property {number} price
 * @property {string} releaseDate
 */

/**
 * @param {{
 *   movie: Movie,
 *   isUpcoming?: boolean,
 *   onBookTicket: () => void,
 *   onViewDetails: () => void
 * }} props
 */
export function MovieCard({ movie, isUpcoming = false, onBookTicket, onViewDetails }) {
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "numeric", year: "numeric" }
    return new Date(dateString).toLocaleDateString("vi-VN", options)
  }

  return (
    <Card
      className={cn(
        // Giảm margin và tăng chiều rộng card
        "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 overflow-hidden rounded-xl transition-all duration-500 w-full max-w-[280px] mx-auto", // Tăng max-w từ mặc định (~240px) lên 280px
        isHovered ? "scale-[1.03] shadow-xl shadow-purple-900/20" : "scale-100",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden aspect-[3/4]"> {/* Tăng aspect-ratio để hình ảnh rộng hơn */}
        <img
          src={movie.image || "/placeholder.svg"}
          alt={movie.title}
          className={cn(
            "w-full h-full object-cover transition-transform duration-700",
            isHovered ? "scale-110" : "scale-100",
          )}
        />
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Rating Badge */}
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center">
          <Star className="w-4 h-4 text-yellow-400 mr-1" />
          <span className="text-sm font-semibold text-white">
            {movie.rating > 0 ? movie.rating : isUpcoming ? "N/A" : "TBA"}
          </span>
        </div>

        {/* Action Buttons */}
        <div
          className={cn(
            "absolute top-3 left-3 flex gap-2 transition-all duration-300",
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="bg-black/50 hover:bg-black/70 text-white w-8 h-8"
            onClick={(e) => {
              e.stopPropagation()
              setIsLiked(!isLiked)
            }}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-black/50 hover:bg-black/70 text-white w-8 h-8"
            onClick={(e) => {
              e.stopPropagation()
              setIsBookmarked(!isBookmarked)
            }}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-purple-500 text-purple-500" : ""}`} />
          </Button>
        </div>

        {/* Quick Actions */}
        <div
          className={cn(
            "absolute bottom-3 left-3 right-3 transition-all duration-300",
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          )}
        >
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0"
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails()
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              Chi tiết
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white border-0"
              onClick={(e) => {
                e.stopPropagation()
                onBookTicket()
              }}
            >
              {isUpcoming ? "Đặt trước" : "Đặt vé"}
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-3"> {/* Giảm padding từ 4 xuống 3 để gọn hơn */}
        <h4 className="font-bold text-lg mb-2 text-white line-clamp-1 hover:text-red-400 transition-colors cursor-pointer">
          {movie.title}
        </h4>
        <div className="flex items-center text-gray-400 text-sm mb-3">
          <Clock className="w-4 h-4 mr-1" />
          <span className="mr-3">{movie.duration}</span>
          <span className="text-xs bg-gray-700 px-2 py-1 rounded">{movie.genre.split(",")[0]}</span>
        </div>

        {isUpcoming ? (
          <div className="mb-3">
  <div className="flex items-center text-gray-400 text-sm mb-2">
    <Calendar className="w-4 h-4 mr-1 text-cyan-400" />
    <span>Khởi chiếu: {formatDate(movie.releaseDate)}</span>
  </div>
  <Button
    size="sm"
    className="bg-cyan-900/50 w-full mt-2 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/40 hover:text-cyan-200 hover:shadow-md transition-colors transition-shadow duration-200"
    onClick={(e) => {
      e.stopPropagation()
      onBookTicket()
    }}
  >
    Nhận thông báo
  </Button>
</div>
        ) : (
          <div className="mb-3">
            <p className="text-sm text-gray-400 mb-2">Suất chiếu hôm nay:</p>
            <div className="flex flex-wrap gap-1">
              {movie.showtimes?.slice(0, 3).map((time, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="border-red-500/50 text-red-400 text-xs hover:bg-red-500/20 cursor-pointer"
                >
                  {time}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}