const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const User = require("./models/user_model");
const Attendance = require("./models/attendance_model");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const { log } = require("console");
const app = express();
const PORT = 5000;

// MongoDB connection
mongoose.connect(
  "mongodb+srv://mallulavenky766:r7JxfiwjUpF4WKX6@cluster0.642vucw.mongodb.net/app?retryWrites=true&w=majority&appName=Cluster0",
  {}
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.send("Hello world");
});

// API endpoint to handle check-ins
app.post("/checkin", upload.single("photo"), async (req, res) => {
  const { userId, date, location, time } = JSON.parse(req.body.data);
  const photo = req.file ? req.file.filename : null;

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
          photo: photo,
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
        photo: photo,
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
app.post("/checkout", upload.single("photo"), async (req, res) => {
  const { userId, date, location, time } = JSON.parse(req.body.data);
  
  const photo = req.file ? req.file.filename : null;

  try {
    let attendance = await Attendance.findOne({ user: userId });
    if (!attendance) {
      return res
        .status(403)
        .json({ error: "Attendance record not found for user" });
    }

    let record = attendance.records.find(
      (r) => r.date.toISOString().split("T")[0] === date
    );
    if (!record) {
      return res
        .status(405)
        .json({ error: "Check-in record not found for today" });
    }

    record.checkOut = {
      location,
      time: time,
      photo: photo,
    };

    await attendance.save();
    res.status(200).json({ message: "Check-out recorded successfully!" });
  } catch (error) {
    console.error("Error saving attendance:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route to fetch dates
app.get("/fetch-marked-dates", async (req, res) => {
  try {
    // Query the database for all dates
    const dates = await Attendance.distinct("records.date");

    // Send dates as JSON response
    res.json(dates);
  } catch (error) {
    console.error("Error fetching dates:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/photos/:userId/:date", async (req, res) => {
  const { userId, date } = req.params;
  console.log(req.params);

  try {
    const attendance = await Attendance.findOne({ user: userId });
    if (!attendance) {
      return res
        .status(404)
        .json({ error: "Attendance record not found for user" });
    }

    const record = attendance.records.find(
      (r) => r.date.toISOString().split("T")[0] === date
    );
    if (!record || !record.checkIn || !record.checkIn.photo) {
      return res
        .status(404)
        .json({ error: "Photo not found for the given date" });
    }

    // Construct the full path to the image
    const imagePath = path.join(__dirname, "uploads", record.checkIn.photo);

    // Check if the file exists
    if (!fs.existsSync(imagePath)) {
      return res
        .status(404)
        .json({ error: "Photo not found for the given date" });
    }

    // Read the file and send it as a response
    const imageStream = fs.createReadStream(imagePath);
    res.writeHead(200, {
      "Content-Type": "image/jpeg",
    });
    imageStream.pipe(res);
  } catch (error) {
    console.error("Error retrieving photo:", error);
    res.status(500).json({ error: error.message });
  }
});



// Function to generate JWT token
const generateToken = (userId) => {
  const secret = "piqyu";
  return jwt.sign({ userId }, secret, { expiresIn: "7d" }); // Adjust token expiration as needed
};

// Login endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Check if username and password are provided
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Generate token
    const token = generateToken(user._id);

    // If authentication succeeds, return success response along with the user's name and token
    return res.status(200).json({
      message: "Login successful",
      userName: user.name,
      user_id: user.employee_id,
      token: token,
      redirect: "/home",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
