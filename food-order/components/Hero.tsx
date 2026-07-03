import { Star, Clock, Bike, MapPin, ChevronRight, Gift } from 'lucide-react'

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10 hero-pattern" />

      <div className="relative max-w-5xl mx-auto px-4 py-5 sm:py-7">
        {/* Promo banner */}
        <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-white/30">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Đang mở cửa · Giao đến 22:00
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              Cơm Rang 247
            </h1>
            <p className="text-orange-100 text-xs sm:text-sm mt-1 font-medium">
              Ngon mỗi ngày — Đúng vị, đúng giờ
            </p>

            {/* Rating */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <div className="flex items-center gap-0.5 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                <Star size={11} strokeWidth={2} className="text-white" />
                <span className="text-white text-xs font-bold">4.9</span>
              </div>
              <span className="text-orange-100 text-xs">· 2.800+ đánh giá</span>
            </div>
          </div>

          {/* Avatar - ẩn trên màn < 360px */}
          <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl shadow-lg items-center justify-center text-3xl sm:text-4xl hidden xs:flex sm:flex">
            🍳
          </div>
        </div>

        {/* Info pills */}
        <div className="flex gap-2 mt-3 sm:mt-4 flex-wrap">
          {[
            { icon: <Bike size={12} />, text: 'Miễn phí ship' },
            { icon: <Clock size={12} />, text: '15–25 phút' },
            { icon: <MapPin size={12} />, text: 'Quận 1, TP.HCM' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/30">
              {icon}
              {text}
            </div>
          ))}
        </div>

        {/* Promo card */}
        <div className="mt-4 bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-white/25 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center text-white"><Gift size={18} strokeWidth={2} /></div>
            <div>
              <p className="text-white font-bold text-sm">Giảm 15% đơn đầu tiên</p>
              <p className="text-orange-100 text-xs">Áp dụng cho tất cả món — Hôm nay thôi!</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-white/70" />
        </div>
      </div>
    </div>
  )
}
