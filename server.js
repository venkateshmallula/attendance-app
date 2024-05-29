const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/user_model")
const Attendance = require("./models/attendance_model");
const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(
  "mongodb+srv://mallulavenky766:r7JxfiwjUpF4WKX6@cluster0.642vucw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/test",
  {}
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});



// Middleware
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello world");
});

// API endpoint to handle check-ins
app.post("/checkin", async (req, res) => {
  const { userId, date, location, time } = req.body;

  try {
    let attendance = await Attendance.findOne({ user: userId });
    if (!attendance) {
      attendance = new Attendance({
        user: userId,
        records: [],
      });
    }

    let record = attendance.records.find(
      (r) => r.date.toISOString().split("T")[0] === date
    );
    if (!record) {
      record = {
        date: date,
        checkIn: {
          location,
          time: time,
        },
        checkOut: {
          location: { latitude: 0, longitude: 0 },
          time: "null",
        },
      };
      attendance.records.push(record);
    } else {
      record.checkIn = {
        location,
        time: time,
      };
    }

    await attendance.save();
    res.status(200).json({ message: "Check-in recorded successfully!" });
  } catch (error) {
    console.error("Error saving attendance:", error);
    res.status(500).json({ error: error.message });
  }
});

// Check-Out Endpoint
app.post('/checkout', async (req, res) => {
  const { userId, date, location, time } = req.body;
  try {
    let attendance = await Attendance.findOne({ user: userId });
    if (!attendance) {
      return res.status(403).json({ error: 'Attendance record not found for user' });
    }

    let record = attendance.records.find(
      (r) => r.date.toISOString().split("T")[0] === date
    );
    if (!record) {
      return res.status(405).json({ error: 'Check-in record not found for today' });
    }

    record.checkOut = {
      location,
      time: time,
    };

    await attendance.save();
    res.status(200).json({ message: 'Check-out recorded successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Login auth----------------------------------------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Check if username and password are provided
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    // Find user by email and password
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Assuming user has a 'name' field in the collection
    const userName = user.name;
    const user_id = user.employee_id;
    // If authentication succeeds, return success response along with the user's name
    return res
      .status(200)
      .json({ message: "Login successful", userName : userName,user_id: user_id, redirect: "/home" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});