const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(bodyParser.json());

// DB Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) throw err;
    console.log("Connected to MySQL DB");
});

// Add School API
app.post("/addSchool", (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const sql = "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";

    db.query(sql, [name, address, latitude, longitude], (err, result) => {
        if (err) return res.status(500).json({ message: "Error", error: err });
        res.status(201).json({ message: "School added", id: result.insertId });
    });
});

// Distance Calculation Function
function getDistance(lat1, lon1, lat2, lon2) {
    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distance in KM
}

// List Schools API
app.get("/listSchools", (req, res) => {
    const userLat = parseFloat(req.query.latitude);
    const userLon = parseFloat(req.query.longitude);

    if (!userLat || !userLon) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    const sql = "SELECT * FROM schools";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: "DB Error", error: err });

        const schoolsWithDistance = results.map((school) => {
            const distance = getDistance(userLat, userLon, school.latitude, school.longitude);
            return { ...school, distance };
        });

        schoolsWithDistance.sort((a, b) => a.distance - b.distance);
        res.json(schoolsWithDistance);
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
