const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  checkIn: {
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },
    time: {
      type: String,
      required: true,
    },
  },
  checkOut: {
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },
    time: {
      type: String,
    },
  },
});

const attendanceSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
  },
  records: [recordSchema],
});

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
