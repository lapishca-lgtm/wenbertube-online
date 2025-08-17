import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import { tmpdir } from "os";
import path from "path";

export default async function handler(req, res) {
  const url = req.query.url;
  const format = req.query.format || "mp4"; // mp4 o mp3

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).send("URL inválida");
  }

  try {
    const info = await ytdl.getInfo(url);
    let title = info.videoDetails.title.replace(/[^\w\s]/gi, "_");

    if (format === "mp4") {
      title += ".mp4";
      const filePath = path.join(tmpdir(), title);
      const video = ytdl(url, { filter: "audioandvideo", quality: "highest" });
      const writeStream = fs.createWriteStream(filePath);

      video.pipe(writeStream);

      writeStream.on("finish", () => {
        res.setHeader("Content-Disposition", `attachment; filename="${title}"`);
        res.setHeader("Content-Type", "video/mp4");
        fs.createReadStream(filePath).pipe(res);
      });
    } else {
      title += ".mp3";
      const filePath = path.join(tmpdir(), title);
      const audioStream = ytdl(url, { filter: "audioonly" });

      ffmpeg(audioStream)
        .setFfmpegPath(ffmpegPath)
        .audioBitrate(128)
        .save(filePath)
        .on("end", () => {
          res.setHeader("Content-Disposition", `attachment; filename="${title}"`);
          res.setHeader("Content-Type", "audio/mpeg");
          fs.createReadStream(filePath).pipe(res);
        });
    }
  } catch (err) {
    res.status(500).send("Error al descargar: " + err.message);
  }
}
