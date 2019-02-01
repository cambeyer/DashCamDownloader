const fs = require("graceful-fs");
const path = require("path");
const drivelist = require('drivelist');
const rimraf = require('rimraf');
const dateFormat = require('dateformat');
const { spawn } = require('child_process');

const FFMPEG = "ffmpeg";

const VIDEO_PATH = "DCIM/105UNSVD";
const OUTPUT_PATH = "output";

const ONE_MINUTE_FIVE_SECONDS_MS = 65000;

var videoFiles = [];

var sort = function (prop, arr) {
	arr.sort(function (a, b) {
		return a[prop] - b[prop];
	});
};

var mergeVideos = function(videoPath, outputPath) {
	let dir = path.join(__dirname, outputPath);
	try { fs.mkdirSync(dir); } catch (e) { }
	console.log("Merging videos at " + videoPath);
	fs.readdir(videoPath, function(err, videoItems) {
		videoItems.forEach((videoItem) => {
			if (videoItem.toLowerCase().indexOf(".mp4") > 0) {
				let filePath = path.join(videoPath, videoItem);
				let stats = fs.statSync(filePath);
				videoFiles.push({
					path: filePath,
					date: stats.mtime
				});
			}
		});
		sort("date", videoFiles);
		let urlFile;
		for (var count = 0; count < videoFiles.length; count++) {
			if (count > 0 && videoFiles[count].date.getTime() - videoFiles[count - 1].date.getTime() > ONE_MINUTE_FIVE_SECONDS_MS) {
				videoFiles.splice(0, count);
				count = 0;
			}
			if (count == 0) {
				urlFile = dateFormat(videoFiles[0].date, "yymmdd_HH_MM_ss") + ".txt";
				rimraf.sync(path.join(dir, urlFile));
			}
			fs.appendFileSync(path.join(dir, urlFile), 'file \'' + videoFiles[count].path + '\'\r\n');
		}
		fs.readdir(dir, function(err, urlFiles) {
			urlFiles.forEach((urlFile) => {
				if (urlFile.indexOf(".txt") > 0) {
					let fullPath = path.join(dir, urlFile);
					let outputFile = fullPath.substr(0, fullPath.lastIndexOf('.')) + '.mp4';
					if (!fs.existsSync(outputFile)) {
						//['-f', 'concat', '-safe', '0', '-i', fullPath, '-c:a', 'aac', '-c:v', 'hevc_videotoolbox', outputFile]
						let ffmpeg = spawn(path.join(__dirname, FFMPEG), ['-f', 'concat', '-safe', '0', '-i', fullPath, '-c', 'copy', outputFile]);
						ffmpeg.stdout.on('data', (data) => {
							//console.log(`stdout: ${data}`);
						});
						ffmpeg.stderr.on('data', (data) => {
							//console.log(`stderr: ${data}`);
						});
						ffmpeg.on('close', (code) => {
							rimraf.sync(fullPath);
						});
					} else {
						rimraf.sync(fullPath);
					}
				}
			});
		});
	});
};

//mergeVideos("/Users/cameron/Desktop/DashCam/DCIM/105UNSVD", OUTPUT_PATH);
 
drivelist.list((error, drives) => {
	drives.forEach((drive) => {
		drive.mountpoints.forEach((mountpoint) => {
			let videoPath = path.join(mountpoint.path, VIDEO_PATH);
			if (fs.existsSync(videoPath)) {
				mergeVideos(videoPath, OUTPUT_PATH);
			}
		});
	});
});