import multer from "multer";

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isAudio = file.mimetype.startsWith("audio/");

    if (!isImage && !isAudio) {
      return cb(new Error("Only image and audio files are allowed"));
    }

    cb(null, true);
  },
});

export default chatUpload;
