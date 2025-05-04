import React, { useState } from 'react'
import { Image, IKImageProps } from '@imagekit/next'

type ImageWithFallbackProps = IKImageProps & {
  fallbackSrc: string
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, fallbackSrc, ...rest }) => {
  const [imgSrc, setImgSrc] = useState(src)

  return (
    <Image
      {...rest}
      src={imgSrc}
      onError={() => setImgSrc(fallbackSrc)}
    />
  )
}

export default ImageWithFallback
