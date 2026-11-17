import { useState, useEffect, useRef } from "react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Star, Clock, Play, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "../lib/utils"
import "../../globals.css"


/**
 * @typedef {Object} Movie
 * @property {number} id
 * @property {string} title
 * @property {number} rating
 * @property {string} duration
 * @property {string} genre
 * @property {string} description
 * @property {string} image
 * @property {string} director
 * @property {string[]} cast
 * @property {string} releaseDate
 * @property {number} price
 */

/**
 * @param {{ movies: Movie[], onBookTicket: (movie: Movie) => void }} props
 */
export function HeroCarousel({ movies, onBookTicket }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const autoPlayRef = useRef(null)

  useEffect(() => {
    startAutoPlay()
    return () => stopAutoPlay()
    // eslint-disable-next-line
  }, [])

  const startAutoPlay = () => {
    stopAutoPlay()
    autoPlayRef.current = setInterval(() => {
      nextSlide()
    }, 6000)
  }

  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current)
      autoPlayRef.current = null
    }
  }

  const nextSlide = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prevIndex) => (prevIndex + 1) % movies.length)
    setTimeout(() => setIsAnimating(false), 500)
    startAutoPlay()
  }

  const prevSlide = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prevIndex) => (prevIndex - 1 + movies.length) % movies.length)
    setTimeout(() => setIsAnimating(false), 500)
    startAutoPlay()
  }

  const goToSlide = (index) => {
    if (isAnimating || index === currentIndex) return
    setIsAnimating(true)
    setCurrentIndex(index)
    setTimeout(() => setIsAnimating(false), 500)
    startAutoPlay()
  }

  const handleTouchStart = (e) => {
    stopAutoPlay()
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 100) {
      nextSlide()
    }
    if (touchStart - touchEnd < -100) {
      prevSlide()
    }
    startAutoPlay()
  }

  const currentMovie = movies[currentIndex]

  return (
    <section
      className="relative h-[80vh] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
     {/* Gradient Overlay */}
<div
  className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-blue-950 z-10"
/>

{/* Background Image with Parallax Effect */}
<div
  className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-out"
  style={{
    backgroundImage: `url(${currentMovie.image})`,
    transform: `scale(${isAnimating ? 1.05 : 1})`,
  }}
/>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white border border-white/20 rounded-full transition-all duration-300 hover:scale-110 hidden md:flex w-10 h-10"
        onClick={prevSlide}
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white border border-white/20 rounded-full transition-all duration-300 hover:scale-110 hidden md:flex w-10 h-10"
        onClick={nextSlide}
      >
        <ChevronRight className="w-5 h-5" />
      </Button>

      <div className="container mx-auto px-4 relative z-20 h-full flex items-center">
        <div className="max-w-2xl">
          <Badge className="mb-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 shadow-lg text-xs px-3 py-1">
            Phim nổi bật
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 text-white leading-tight">
            {currentMovie.title}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-gray-300">
            <div className="flex items-center bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
              <Star className="w-4 h-4 text-yellow-400 mr-1" />
              <span className="font-semibold text-sm">{currentMovie.rating}</span>
            </div>
            <div className="flex items-center bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
              <Clock className="w-4 h-4 mr-1" />
              <span className="text-sm">{currentMovie.duration}</span>
            </div>
            <span className="px-3 py-1 bg-black/40 backdrop-blur-sm rounded-full text-sm border border-white/20">
              {currentMovie.genre.split(",")[0]}
            </span>
          </div>
          <p className="text-gray-300 mb-6 leading-relaxed text-sm md:text-base max-w-xl line-clamp-3 md:line-clamp-4">
            {currentMovie.description}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-500 text-white border-0 px-5 py-2.5 text-sm md:text-base h-auto shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 hover:scale-105"
              onClick={() => onBookTicket(currentMovie)}
            >
              Đặt vé ngay - {currentMovie.price.toLocaleString()}đ
            </Button>
            <Button
  variant="outline"
  className="border-zinc-300/40 text-white bg-transparent hover:bg-zinc-200/20 hover:border-zinc-300/70 hover:text-zinc-100 px-5 py-2.5 text-sm md:text-base h-auto backdrop-blur-sm transition-all duration-300 hover:scale-105"
>
              <Play className="w-4 h-4 mr-2" />
              Xem trailer
            </Button>
          </div>
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
        {movies.map((_, index) => (
          <button
            key={index}
            className={cn(
              "h-2 rounded-full transition-all duration-500 backdrop-blur-sm",
              index === currentIndex
                ? "bg-gradient-to-r from-cyan-400 to-blue-500 w-8 shadow-lg"
                : "bg-white/40 hover:bg-white/60 w-2 border border-white/30",
            )}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </section>
  )
}