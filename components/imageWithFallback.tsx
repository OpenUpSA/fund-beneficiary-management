import React, { useState } from 'react'
import { Image, IKImageProps } from '@imagekit/next'

type ImageWithFallbackProps = IKImageProps & {
  fallbackSrc: string
  alt: string
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, fallbackSrc, alt, ...rest }) => {
  const [imgSrc, setImgSrc] = useState(src)

  return (
    <Image
      {...rest}
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(fallbackSrc)}
    />
  )
}

export default ImageWithFallback
