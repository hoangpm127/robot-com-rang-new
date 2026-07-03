'use client'

import Image from 'next/image'
import { useState } from 'react'
import clsx from 'clsx'

const GRADIENTS = [
  'from-orange-100 to-amber-200',
  'from-red-100 to-orange-200',
  'from-amber-100 to-yellow-200',
  'from-orange-200 to-red-200',
  'from-yellow-100 to-amber-100',
]

interface Props {
  src: string
  alt: string
  emoji: string
  index?: number
  size?: 'sm' | 'lg'
  className?: string
}

export default function FoodImage({ src, alt, emoji, index = 0, size = 'lg', className }: Props) {
  const [error, setError] = useState(false)
  const gradient = GRADIENTS[index % GRADIENTS.length]
  const emojiCls = size === 'sm' ? 'text-2xl' : 'text-5xl sm:text-6xl drop-shadow'

  if (error) {
    return (
      <div className={clsx('w-full h-full flex items-center justify-center bg-gradient-to-br', gradient, className)}>
        <span className={emojiCls}>{emoji}</span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={clsx('object-cover', className)}
      onError={() => setError(true)}
      unoptimized
    />
  )
}
