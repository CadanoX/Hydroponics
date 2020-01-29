const fs = require('fs');

{
    function directoryExists(filePath) {
        try { return fs.statSync(filePath).isDirectory(); }
        catch (err) { return false; }
    }

	class Storage {
		constructor(path = "./OLD-data", options = {}) {
			this._path;
            this._filename;
            this.path(path);

            this._data = [];

            this._options = {
                interval: 10000,
                fileChangeInterval: 60 * 60 * 1000,
                precision: 4
            };
            this._setOptions(options);

            this._storeInterval;
            this._fileChangeInterval;
            this._start();
		}

        options(d) { return d == null ? this._options : (this._setOptions(d), this); }
        path(d) { return d == null ? this._path : (this._setPath(d), this); }

        // read config.json from path and apply its options
        config(path)
        {
            // if there exists a config.json file in the path, apply it
            fs.readFile(path + "/config.json", (error, data) =>
            {
                if (error)
                {
                    if (error.code === 'EACCES')
                        console.log(`No permission to read ${path}/config.json`);
                    else if (error.code !== 'ENOENT')
                        throw error;
                }
                else
                {
                    let options = null;
                    try { options = JSON.parse(data); }
                    catch(e) { console.log(e); }
                    
                    if (options)
                        this.options(options);
                }
            });
        }

        copy(path)
        {
            if (!directoryExists(path))
                fs.mkdirSync(path);

            fs.readdir(this._path, (err, files) => {
                if (err)
                    console.error(`Read storage: ${err}`);
                else
                    files.forEach(file =>
                    {
                        let source = this._path + '/' + file;
                        fs.copyFile(source, path + '/' + file, (err) => {
                            if (err)
                                console.error(`Write USB: ${err}`);
                            else // successfully stored ==> delete from storage
                                fs.unlink(source, (err) => {
                                    if (err)
                                        console.error(err)
                                });
                          });
                    });
            });
        }

        _start()
        {
            clearInterval(this._storeInterval);
            this._storeInterval = setInterval(() => this._store(), this._options.interval);
            this._fileChangeInterval = setInterval(this._changeDataFile, this._options.fileChangeInterval);
        }

        _setPath(path)
        {
            if (this._path != path)
            {
                console.log("new storage path: " + path);
                this._path = path;

                // if the data folder does not exist on the device, create it
                if (!directoryExists(path))
                    fs.mkdirSync(path);

                // new filename to avoid name collisions
                this._changeDataFile();
            }
        }

        _setOptions(options)
        {
            if (!options || (typeof options !== "object")) return console.log(`ERROR: Config data "${options}" is not an object.`);
            
            for (const [key, value] of Object.entries(options)) {
                switch(key) {
                    case 'interval':
                        if (!Number.isInteger(value))
                            console.log("Storage interval must be an integer.");
                        else if (value < 1)
                            console.log("Storage interval must be >= 1.");
                        else {
                            this._options.interval = value * 1000;
                            this._start();
                        }
                        break;
                        
                    case 'precision':
                        if (Number.isInteger(value))
                            this._options.precision = value;
                        else
                            console.log("Storage precision must be an integer.");
                        break;

                    case 'fileChangeInterval':
                        if (!Number.isInteger(value))
                            console.log("Storage fileChangeInterval must be an integer.");
                        else if (value < 1)
                            console.log("Storage fileChangeInterval must be >= 1.");
                        else
                            this._options.fileChangeInterval = value * 1000;
                        break;

                    case 'aggregation':
                        this._options.aggregation = value; // average, median, null
                        break;

                    case '//': // ignore comments
                        break

                    default: console.log(`Option '${key}' is not defined for Storage class.`);
                        break;
                }
            }
        }

		add(d) {
			if (!d || (typeof d !== "object")) return console.log(`ERROR: Added data "${d}" is not an object.`);
            let o = {
                timestamp: new Date(),
                data: d
            };

            this._data.push(o);
        }

        _store()
        {
            if (this._data.length == 0)
                return;

            let numAggregations = (this._data[this._data.length-1].timestamp - this._data[0].timestamp) / this._options.interval;
            if (numAggregations < 1)
                return;

            const filepath = this._path + '/' + this._filename;

            let aggregatedData = [];
            let lastStoredIndex = -1;

            if(this._options.aggregation == "average")
            {
                let aggregate = {
                    timestamp: this._data[0].timestamp,
                    data: {},
                    num: {}
                };
                // go through all timesteps
                for (var i = 0; i < this._data.length; i++)
                {
                    if ((this._data[i].timestamp - aggregate.timestamp) >= this._options.interval)
                    {
                        // calculate average for each measure
                        for (const measure in aggregate.data)
                            aggregate.data[measure] = aggregate.data[measure] / aggregate.num[measure];

                        aggregatedData.push(aggregate);
                        
                        // start new aggregate
                        aggregate.timestamp = this._data[i].timestamp;
                        aggregate.data = {};
                        aggregate.num = {};
                        lastStoredIndex = i - 1;
                    }

                    // sum up the values of successive timesteps for each measurement individually
                    for (const [measure, value] of Object.entries(this._data[i].data))
                    {
                        if (!!aggregate.data[measure]) {
                            aggregate.data[measure] += Number.parseFloat(value);
                            aggregate.num[measure]++;
                        }
                        else {
                            aggregate.data[measure] = Number.parseFloat(value);
                            aggregate.num[measure] = 0;
                        }
                    }

                    // delete stored data from memory
                    this._data.splice(0, lastStoredIndex+1)
                }
            }
            else if (this._options.aggregation == "median")
            {
                let aggregate = {
                    timestamp: this._data[0].timestamp,
                    data: {}
                };
                // go through all timesteps
                for (var i = 0; i < this._data.length; i++)
                {
                    if ((this._data[i].timestamp - aggregate.timestamp) >= this._options.interval)
                    {
                        // calculate average for each measure
                        for (const measure in aggregate.data) {
                            aggregate.data[measure].sort();
                            let num = aggregate.data[measure].length;
                            if (num % 2 === 0) // calculate average between the 2 middle numbers
                                aggregate.data[measure] = (aggregate.data[measure][num/2 -1] + aggregate.data[measure][num/2]) /2;
                            else // median
                                aggregate.data[measure] = aggregate.data[measure][(num-1)/2]
                        }

                        aggregatedData.push(aggregate);
                        
                        // start new aggregate
                        aggregate.timestamp = this._data[i].timestamp;
                        aggregate.data = {};
                        lastStoredIndex = i - 1;
                    }

                    // sum up the values of successive timesteps for each measurement individually
                    for (const [measure, value] of Object.entries(this._data[i].data))
                    {
                        if (!!aggregate.data[measure]) {
                            aggregate.data[measure].push(Number.parseFloat(value));
                        }
                        else {
                            aggregate.data[measure] = [Number.parseFloat(value)];
                        }
                    }

                    // delete stored data from memory
                    this._data.splice(0, lastStoredIndex+1)
                }
            }
            else // don't aggregate
            {
                aggregatedData = this._data.splice(0, this._data.length);
            }

            // store in file
            let fd;
            try
            {
                fd = fs.openSync(filepath, 'a');

                // go through all timesteps
                for (var i = 0; i < aggregatedData.length; i++)
                {
                    // go through all measurements
                    for (var m in aggregatedData[i].data)
                    {
                        let value = Number.parseFloat(aggregatedData[i].data[m]).toFixed(this._options.precision);
                        const data = `${aggregatedData[i].timestamp.toLocaleString()},${m},${value}\n`;
                        fs.appendFileSync(fd, data, 'utf8');
                    }
                }
            }
            catch (error) {
                console.error(`Write error to ${filepath}: ${error.message}`);
            }
            finally {
                if (fd !== undefined)
                    fs.closeSync(fd);
            }
        }
        
        _changeDataFile()
        {
            this._filename = 'data' + new Date().getTime() + '.csv';
        }
    }

    module.exports = Storage;
}