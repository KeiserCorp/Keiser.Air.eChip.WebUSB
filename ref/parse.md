```js
module.exports = function() {
	'use strict';
	var moment = require('moment');
	var $ = require('jquery');
	var eCp = {};

	/*
	 * Constants
	 */
	const POWER_TEST = 'power6r';
	const A420_6R_TEST = 'a4206r';
	const A420_10R_TEST = 'a42010r';
	const PRECISION = {
		DECIMAL: 'dec',
		INTEGER: 'int',
	};
	const FORCE = {
		LB: 'lb',
		KG: 'kg',
		NE: 'ne',
		ER: 'er',
	};
	const TIME_FORMAT = 'MMDD YYYY HHmm ss';

	/*
	 *	Parser
	 *
	 *	Machine Parser:	Parses most new machines.  Does not handle Heavy Negative Machines or
	 *					Special Runners.  Extra Data seat positions are not being included.
	 */
	eCp.parse = function(data) {
		var eChipObject = {};
		if (validData(data)) {
			parseDirectory(data, eChipObject);
		} else {
			throw new Error('Invalid Data Structure');
		}
		return eChipObject;
	};

	var validData = function(data) {
		var valid = true;
		data.forEach(function(page) {
			if (!emptyPage(page)) {
				var crc = 0;
				for (var x = 0; x < 32; x++) {
					crc = crc16(page[x], crc);
				}
				if (crc != 0xB001) {
					valid = false;
				}
			}
		});
		return valid;
	};

	var parseDirectory = function(data, eChipObject) {
		for (var y = 1; y <= 8; y++) {
			for (var x = 0; x < 3; x++) {
				var pageOffset = (y * 32) - 2;
				var bufferOffset = x * 10;
				if (data[pageOffset][bufferOffset] === 1) {
					var model = byteToString(data[pageOffset][bufferOffset + 1], data[pageOffset][bufferOffset + 2]);
					eChipObject[model] = {
						position: {
							chest: valueOrNull(data[pageOffset][bufferOffset + 3]),
							rom2: valueOrNull(data[pageOffset][bufferOffset + 4]),
							rom1: valueOrNull(data[pageOffset][bufferOffset + 5]),
							seat: valueOrNull(data[pageOffset][bufferOffset + 6]),
						}
					};
					var firstPage = data[pageOffset][bufferOffset + 7];
					parseMachineSet(data, eChipObject[model], firstPage);
				}
			}
		}
	};

	var parseMachineSet = function(data, machineObject, page) {
		var fatBuffer = (Math.floor(page / 32) * 32) + 31;
		var fatBufferOffset = (page % 30);
		var nextPage = data[fatBuffer][fatBufferOffset];
		var dataPage = data[page];

		var set = {};
		set.model = byteToString(dataPage[7], dataPage[8]);
		set.version = byteToLongString(dataPage[12], dataPage[11], dataPage[10], dataPage[9]);
		set.serial = byteToSerialString(dataPage[13], dataPage[14], dataPage[15], dataPage[16], dataPage[17], set.version);
		set.time = moment(byteToTime(dataPage[0], dataPage[1], dataPage[2], dataPage[3])).format();
		set.resistance = byteToWord(dataPage[4], dataPage[5]);
		set.precision = PRECISION.INTEGER;
		set.units = null;
		set.repetitions = dataPage[6];

		if (unitVersion(set.version)) {
			if ((dataPage[17] & 0x80) == 0x80) {
				set.resistance = set.resistance / 10;
				set.precision = PRECISION.DECIMAL;
			}

			switch (dataPage[17] & 0x60) {
				case 0x00:
					set.units = FORCE.LB;
					break;
				case 0x20:
					set.units = FORCE.KG;
					break;
				case 0x40:
					set.units = FORCE.NE;
					break;
				case 0x60:
					set.units = FORCE.ER;
					break;
			}
		}

		if (testVersion(set.version)) {
			if (set.repetitions <= 254 && set.repetitions >= 252) {
				set.test = {};
				switch (set.repetitions) {
					case 254:
						set.test.type = POWER_TEST;
						set.test.low = decodePackData(dataPage, 18);
						set.test.high = decodePackData(dataPage, 24);
						set.repetitions = 6;
						break;
					case 253:
						set.test.type = A420_6R_TEST;
						set.repetitions = 6;
						break;
					case 252:
						set.test.type = A420_10R_TEST;
						set.repetitions = 10;
						break;
				}
			} else {
				if (peakPowerVersion(set.version)) {
					set.peak = byteToWord(dataPage[20], dataPage[21]);
					set.work = Math.round(byteToLongWord(dataPage[22], dataPage[23], dataPage[24], dataPage[25]) / 64);
					//set.work = byteToLongWord(dataPage[22], dataPage[23], dataPage[24], dataPage[25]) / 64;

					if ((parseInt(set.model, 16) & 0xFF00) == 0x3200) {
						set.distance = byteToWord(dataPage[18], dataPage[19]);
					}
				}
			}
		}

		if (!machineObject.sets) {
			machineObject.sets = [];
		}
		machineObject
			.sets
			.push(set);

		if ((nextPage & 30) != 30) {
			parseMachineSet(data, machineObject, nextPage);
		}
	};

	var decodePackData = function(dataPage, pageOffset) {
		var testObject = {};
		testObject.power = dataPage[pageOffset] + ((dataPage[pageOffset + 2] & 0x1F) << 8);
		testObject.velocity = dataPage[pageOffset + 1] + ((dataPage[pageOffset + 2] & 0xE0) << 3) + (((dataPage[pageOffset + 2] & 0x80) >> 7) * 0xF8);
		testObject.force = (dataPage[pageOffset + 3] + ((dataPage[pageOffset + 5] & 0xF0) << 4)) << 4;
		testObject.position = dataPage[pageOffset + 4] + ((dataPage[pageOffset + 5] & 0x0F) << 8);
		return testObject;
	};

	/*
	 *	Version Tests
	 */

	var testVersion = function(version) {
		var versionValue = parseInt(version, 16);
		return (versionValue > 0x2F6579F0);
	};

	var peakPowerVersion = function(version) {
		var versionValue = parseInt(version, 16);
		return (versionValue > 0x32BA5C89);
	};

	var unitVersion = function(version) {
		var versionValue = parseInt(version, 16);
		return (versionValue > 0x318E4F00);
	};

	/*
	 *	Builder
	 */
	eCp.build = function(machines) {
		var data = eCp.buildEmpty();
		const maxDirectories = 24;
		const maxRecords = 242;
		var directoryIndex = 0;
		var recordIndex = 0;

		$.each(machines, function(model, attributes) {
			if (directoryIndex < maxDirectories && recordIndex < maxRecords) {
				var modelValue = model;
				if (typeof(model) == 'string') {
					modelValue = parseInt(model, 16);
				}

				var pageOffset = (Math.floor(directoryIndex / 3) * 32) + 30;
				var bufferOffset = (directoryIndex % 3) * 10;
				data[pageOffset][bufferOffset] = 1;
				var modelBytes = wordToByte(modelValue);
				data[pageOffset][bufferOffset + 1] = modelBytes[1];
				data[pageOffset][bufferOffset + 2] = modelBytes[0];
				data[pageOffset][bufferOffset + 3] = positionToByte(attributes.position.chest);
				data[pageOffset][bufferOffset + 4] = positionToByte(attributes.position.rom2);
				data[pageOffset][bufferOffset + 5] = positionToByte(attributes.position.rom1);
				data[pageOffset][bufferOffset + 6] = positionToByte(attributes.position.seat);
				data[pageOffset][bufferOffset + 7] = recordIndex;

				attributes
					.sets
					.forEach(function(set, index) {
						var recordPage = (Math.floor(recordIndex / 30) * 32) + (recordIndex % 30);
						buildMachineSet(set, attributes.position, data[recordPage]);

						var fatPage = (Math.floor(recordIndex / 30) * 32) + 31;
						var fatPageOffset = recordIndex % 30;
						data[fatPage][fatPageOffset] = (index + 1 < attributes.sets.length) ?
							recordIndex + 1 :
							0xFE;

						recordIndex++;
					});

				directoryIndex++;
			}
		});

		buildCRC(data);

		return data;
	};

	var buildMachineSet = function(set, position, page) {
		var time = timeToByte(set.time);
		var resistance = wordToByte(set.resistance);
		if (set.precision == PRECISION.DECIMAL) {
			resistance = wordToByte(set.resistance * 10);
		}
		var repetitions = repToByte(set.repetitions, set.test);
		var model = wordToByte(parseInt(set.model, 16));
		var version = longWordToByte(parseInt(set.version, 16));
		var serialTime = serialStringToTimeByte(set.serial);
		var channel = serialStringToChannelByte(set.serial, set.version, set.precision, set.units);

		page[0] = time[3];
		page[1] = time[2];
		page[2] = time[1];
		page[3] = time[0];
		page[4] = resistance[1];
		page[5] = resistance[0];
		page[6] = repetitions;
		page[7] = model[1];
		page[8] = model[0];
		page[9] = version[0];
		page[10] = version[1];
		page[11] = version[2];
		page[12] = version[3];
		page[13] = serialTime[3];
		page[14] = serialTime[2];
		page[15] = serialTime[1];
		page[16] = serialTime[0];
		page[17] = channel;

		if (set.test) {
			buildMachineTestData(set, page);
		} else {
			buildMachineNormalData(set, position, page);
		}

	};

	var buildMachineTestData = function(set, page) {
		// Need to add repack data
	};

	var buildMachineNormalData = function(set, position, page) {
		if (peakPowerVersion(set.version)) {
			var peak = wordToByte(set.peak);
			var work = longWordToByte(set.work * 64);
			var seat = (position.seat == null) ?
				0xFF :
				position.seat;
			var rom1 = (position.rom1 == null) ?
				0xFF :
				position.rom1;
			var rom2 = (position.rom2 == null) ?
				0xFF :
				position.rom2;
			var chest = (position.chest == null) ?
				0xFF :
				position.chest;

			if ((parseInt(set.model, 16) & 0xFF00) == 0x3200) {
				var distance = wordToByte(set.distance);
				page[18] = distance[1];
				page[19] = distance[0];
			} else {
				page[18] = 0;
				page[19] = 0;
			}

			page[20] = peak[1];
			page[21] = peak[0];
			page[22] = work[3];
			page[23] = work[2];
			page[24] = work[1];
			page[25] = work[0];
			page[26] = seat;
			page[27] = rom2;
			page[28] = rom1;
			page[29] = chest;
		}
	};

	var buildCRC = function(data) {
		data
			.forEach(function(page) {
				if (!emptyPage(page)) {
					var crc = 0;
					for (var x = 0; x < 30; x++) {
						crc = crc16(page[x], crc);
					}
					var crcValue = wordToByte(crc ^ 0xFFFF);
					page[30] = crcValue[1];
					page[31] = crcValue[0];
				}
			});
	};

	/*
	 *	Build Empty Chip
	 */
	eCp.buildEmpty = function() {
		var data = new Array(256);
		for (var y = 0; y < data.length; y++) {
			data[y] = new Uint8Array(32);
			for (var x = 0; x < data[y].length; x++) {
				if (y > 0 && (y % 32 === 30 || y % 32 === 31)) {
					if (x == data[y].length - 1) {
						data[y][x] = 0xCF;
					} else {
						data[y][x] = 0xFF;
					}
				} else {
					data[y][x] = 0x55;
				}
			}
		}

		return data;
	};

	/*
	 *	Helper Methods
	 */
	var positionToByte = function(value) {
		return (value == null) ?
			0xFF :
			value;
	};

	var byteToWord = function(lsb, msb) {
		return ((msb & 0xFF) << 8) | (lsb & 0xFF);
	};

	var wordToByte = function(word) {
		return [
			(word & 0xFF00) >> 8,
			(word & 0x00FF),
		];
	};

	var byteToLongWord = function(lsb, byte2, byte3, msb) {
		return ((msb & 0xFF) << 24) | ((byte3 & 0xFF) << 16) | ((byte2 & 0xFF) << 8) | (lsb & 0xFF);
	};

	var longWordToByte = function(word) {
		return [
			(word & 0xFF000000) >> 24,
			(word & 0x00FF0000) >> 16,
			(word & 0x0000FF00) >> 8,
			(word & 0x000000FF),
		];
	};

	var byteToString = function(lsb, msb) {
		return ('0000' + (msb.toString(16) + lsb.toString(16)))
			.substr(-4)
			.toUpperCase();
	};

	var byteToLongString = function(lsb, byte2, byte3, msb) {
		return ('00000000' + (msb.toString(16) + byte3.toString(16) + byte2.toString(16) + lsb.toString(16)))
			.substr(-8)
			.toUpperCase();
	};

	var byteToTime = function(lsb, byte2, byte3, msb) {
		return new Date(byteToLongWord(lsb, byte2, byte3, msb) * 1000);
	};

	var timeToByte = function(time) {
		var dateTime = moment(time);
		var unixTime = dateTime.format('X');
		return longWordToByte(unixTime);
	};

	var byteToSerialString = function(lsb, byte2, byte3, msb, channel, version) {
		var time = byteToTime(lsb, byte2, byte3, msb);
		var serial = moment(time)
			.utc()
			.format(TIME_FORMAT);
		if (unitVersion(version)) {
			serial += ('00' + ((channel & 0x1F) + 0x20).toString()).substr(-2);
		} else {
			serial += ((channel & 0xF0) / 0x10).toString(16);
			serial += (channel & 0x1F).toString(16);
		}
		return serial;
	};

	var serialStringToTimeByte = function(serial) {
		var serialString = serial;
		var time = moment(serialString, TIME_FORMAT);
		return longWordToByte(time.utc().format('X') - 28800);
	};

	var serialStringToChannelByte = function(serial, version, precision, units) {
		var channel = 0;
		if (unitVersion(version)) {
			channel = parseInt(serial.substr(-2)) - 0x20;
		} else {
			channel = parseInt(serial.substr(-2));
		}

		if (precision == PRECISION.DECIMAL) {
			channel = channel | 0x80;
		}

		switch (units) {
			case FORCE.KG:
				channel = channel | 0x20;
				break;
			case FORCE.NE:
				channel = channel | 0x40;
				break;
			case FORCE.ER:
				channel = channel | 0x60;
				break;
		}
		return channel;
	};

	var repToByte = function(repetitions, test) {
		var repetitionsValue = repetitions;
		if (test) {
			switch (test) {
				case POWER_TEST:
					repetitionsValue = 254;
					break;
				case A420_6R_TEST:
					repetitionsValue = 253;
					break;
				case A420_10R_TEST:
					repetitionsValue = 252;
					break;
			}
		}
		return repetitionsValue;
	};

	var valueOrNull = function(value) {
		return (value === 255) ?
			null :
			value;
	};

	var emptyPage = function(page) {
		var empty = true;
		page.forEach(function(tuple) {
			if (tuple != 0x55) {
				empty = false;
			}
		});
		return empty;
	};

	var crc16 = function(data, crc) {
		var value = data;
		for (var x = 1; x <= 8; x++) {
			var odd = (value ^ crc) % 2;
			crc = crc >> 1;
			value = value >> 1;
			if (odd) {
				crc = crc ^ 0xA001;
			}
		}
		return crc;
	};

	return eCp;
}();