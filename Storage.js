/*
Data is added to the storage and frequently written to a file.
The chosen interval regulates writing operations to the harddrive.
By regularly changing the file name, large data files can be avoided.
*/

const fs = require("fs");

const Aggregation = Object.freeze({
  AVERAGE: Symbol("average"),
  MEDIAN: Symbol("median"),
  NONE: Symbol("none"),
});

function directoryExists(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (err) {
    return false;
  }
}

function median(array) {
  array.sort();
  let num = array.length;
  if (num % 2 == 1)
    // median is center
    return array[(num - 1) / 2];
  // calculate average between the 2 middle numbers
  else return (array[num / 2 - 1] + array[num / 2]) / 2;
}

class Storage {
  constructor(path = "./OLD-data", options = {}) {
    this._opts = {
      storeInterval: 10000, // write to file every x milliseconds
      fileChangeInterval: 60 * 60 * 1000, // write to new file every x milliseconds
      precision: 4, // floating precision
      aggregation: Aggregation.NONE,
      ...options, // overwrite default settings with user settings
    };
    this._data = [];
    this._path;
    this._filename;
    // Timers call functions every x milliseconds
    this._storeTimer;
    this._fileChangeTimer;

    this.path(path);
    this.options(options);
    this._reset();
  }

  options(d) {
    return d == null ? this._opts : (this._setOptions(d), this);
  }
  path(d) {
    return d == null ? this._path : (this._setPath(d), this);
  }

  // read config.json from path and apply its options
  config(path) {
    // if there exists a config.json file in the path, apply it
    fs.readFile(path + "/config.json", (error, data) => {
      if (error) {
        if (error.code === "EACCES")
          console.log(`No permission to read ${path}/config.json`);
        else if (error.code !== "ENOENT") throw error;
      } else {
        let options = null;
        try {
          options = JSON.parse(data);
        } catch (e) {
          console.log(e);
        }

        if (options) this._setOptions(options);
      }
    });
  }

  // add new data to store it later
  add(d) {
    if (!d || typeof d !== "object")
      return console.log(`ERROR: Added data "${d}" is not an object.`);
    let o = {
      timestamp: new Date(),
      data: d,
    };

    this._data.push(o);
  }

  // copy all stored data to the given path
  // if cut is true, delete successfully copied files from storage
  copyTo(path, cut = false) {
    // if path does not exist, create folder
    if (!directoryExists(path)) fs.mkdirSync(path);

    // copy all files
    fs.readdir(this._path, (err, files) => {
      if (err) console.error(`Read storage: ${err}`);
      else
        files.forEach((file) => {
          let source = this._path + "/" + file;
          fs.copyFile(source, path + "/" + file, (err) => {
            if (err) console.error(`Write USB: ${err}`);
            else {
              // delete successfully copied files from storage
              if (cut)
                fs.unlink(source, (err) => {
                  if (err) console.error(err);
                });
            }
          });
        });
    });
  }

  // set new interval values for function calls
  _reset() {
    clearInterval(this._storeTimer);
    this._storeTimer = setInterval(
      () => this._store(),
      this._opts.storeInterval
    );
    this._fileChangeTimer = setInterval(
      this._changeDataFile,
      this._opts.fileChangeInterval
    );
  }

  // define where to store data files
  _setPath(path) {
    if (this._path != path) {
      console.log("new storage path: " + path);
      this._path = path;

      // if the data folder does not exist on the device, create it
      if (!directoryExists(path)) fs.mkdirSync(path);

      // new filename to avoid name collisions
      this._changeDataFile();
    }
  }

  _setOptions(options) {
    if (!options || typeof options !== "object")
      return console.log(`ERROR: Config data "${options}" is not an object.`);

    // check validity of option values
    for (const [key, value] of Object.entries(options)) {
      switch (key) {
        case "interval":
          if (!Number.isInteger(value))
            console.log("Storage interval must be an integer.");
          else if (value < 1) console.log("Storage interval must be >= 1.");
          else {
            this._opts.storeInterval = value * 1000;
            this._reset();
          }
          break;

        case "precision":
          if (Number.isInteger(value)) this._opts.precision = value;
          else console.log("Storage precision must be an integer.");
          break;

        case "fileChangeInterval":
          if (!Number.isInteger(value))
            console.log("Storage fileChangeInterval must be an integer.");
          else if (value < 1)
            console.log("Storage fileChangeInterval must be >= 1.");
          else this._opts.fileChangeInterval = value * 1000;
          break;

        case "aggregation":
          if (value == "median") this._opts.aggregation = Aggregation.MEDIAN;
          else if (value == "average")
            this._opts.aggregation = Aggregation.AVERAGE;
          else if (value == "none") this._opts.aggregation = Aggregation.NONE;
          else console.log(`Aggregation method '${value}' is not defined.`);
          break;

        case "//": // ignore comments
          break;

        default:
          console.log(`Option '${key}' is not defined for Storage class.`);
          break;
      }
    }
  }

  // write the received data to a file
  // data values can be aggregated by changing the aggregation mode
  _store() {
    if (this._data.length == 0) return;

    let timePassed =
      this._data[this._data.length - 1].timestamp - this._data[0].timestamp;
    if (timePassed < this._opts.storeInterval) return;

    let aggregatedData = [];
    let lastStoredIndex = -1;

    // aggregate data values based on the chosen aggregation method
    if (this._opts.aggregation == Aggregation.AVERAGE) {
      let aggregate = {
        timestamp: this._data[0].timestamp,
        data: {},
        num: {},
      };

      // go through all timesteps
      for (var i = 0; i < this._data.length; i++) {
        // check timestamps to split data into intervals
        let newInterval =
          this._data[i].timestamp - aggregate.timestamp >=
          this._opts.storeInterval;

        if (newInterval) {
          // calculate average for each measure
          // the measure is now the sum of all measures
          for (const measure in aggregate.data)
            aggregate.data[measure] /= aggregate.num[measure];

          aggregatedData.push(aggregate);

          // start new aggregate
          aggregate = {
            timestamp: this._data[i].timestamp,
            data: {},
            num: {},
          };
          lastStoredIndex = i - 1;
        }

        // sum up the values of successive timesteps for each measurement individually
        for (const [measure, value] of Object.entries(this._data[i].data)) {
          if (!aggregate.data[measure]) {
            // first value
            aggregate.data[measure] = Number.parseFloat(value);
            aggregate.num[measure] = 1;
          } else {
            aggregate.data[measure] += Number.parseFloat(value);
            aggregate.num[measure]++;
          }
        }

        // delete stored data from memory
        this._data.splice(0, lastStoredIndex + 1);
      }
    } else if (this._opts.aggregation == Aggregation.MEDIAN) {
      let aggregate = {
        timestamp: this._data[0].timestamp,
        data: {},
      };
      // go through all data values
      for (var i = 0; i < this._data.length; i++) {
        // check timestamps to split data into intervals
        let newInterval =
          this._data[i].timestamp - aggregate.timestamp >=
          this._opts.storeInterval;

        if (newInterval) {
          // the value is now an array of values
          // replace data values by their median
          for (const measure in aggregate.data) {
            aggregate.data[measure] = median(aggregate.data[measure]);
          }

          // store median
          aggregatedData.push(aggregate);

          // start new aggregate
          aggregate = {
            timestamp: this._data[i].timestamp,
            data: {},
          };
          lastStoredIndex = i - 1;
        }

        // create a new data array for each individual measure
        for (const [measure, value] of Object.entries(this._data[i].data)) {
          if (!aggregate.data[measure]) aggregate.data[measure] = [];
          aggregate.data[measure].push(Number.parseFloat(value));
        }

        // delete stored data from memory
        this._data.splice(0, lastStoredIndex + 1);
      }
    } // do not aggregate
    else if (this._opts.aggregation == Aggregation.NONE) {
      aggregatedData = this._data.splice(0, this._data.length);
    }

    this._writeToFile(aggregatedData);
  }

  _writeToFile(data) {
    if (!data || data.length == 0) return;

    const filepath = this._path + "/" + this._filename;
    let fd;
    try {
      fd = fs.openSync(filepath, "a");

      // go through all timesteps
      for (var i = 0; i < data.length; i++) {
        // go through all measurements
        const timestamp = data[i].timestamp.toLocaleString();
        for (let [m, v] of Object.entries(data[i].data)) {
          const value = Number.parseFloat(v).toFixed(this._opts.precision);
          const data = `${timestamp},${m},${value}\n`;
          fs.appendFileSync(fd, data, "utf8");
        }
      }
    } catch (error) {
      console.error(`Write error to ${filepath}: ${error.message}`);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }

  _changeDataFile() {
    this._filename = "data" + new Date().getTime() + ".csv";
  }
}

module.exports = Storage;
