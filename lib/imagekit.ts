import ImageKit from "imagekit"

let _imagekit: ImageKit | null = null

function getImageKit(): ImageKit {
  if (!_imagekit) {
    _imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
      urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
    })
  }
  return _imagekit
}

export default getImageKit