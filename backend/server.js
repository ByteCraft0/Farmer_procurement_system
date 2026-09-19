const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// =====================================================
// BASIC TEST ROUTE
// =====================================================

app.get("/", (req, res) => {
    res.json({
        message: "AgroNex backend is running"
    });
});

// =====================================================
// DATABASE TEST
// =====================================================

app.get("/api/test", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM users");

        res.json(rows);
    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            error: "Database connection failed"
        });
    }
});

// =====================================================
// REGISTER
// =====================================================

app.post("/api/auth/register", async (req, res) => {
    try {
        const {
            name,
            phone,
            password,
            role,
            village
        } = req.body;

        if (!name || !phone || !password) {
            return res.status(400).json({
                error: "Name, phone and password are required"
            });
        }

        if (role !== "farmer" && role !== "staff") {
            return res.status(400).json({
                error: "Invalid role"
            });
        }

        const [existingUsers] = await db.query(
            "SELECT id FROM users WHERE phone = ?",
            [phone]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                error: "Phone number already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [userResult] = await db.query(
            `INSERT INTO users
            (name, phone, password, role)
            VALUES (?, ?, ?, ?)`,
            [
                name,
                phone,
                hashedPassword,
                role
            ]
        );

        const userId = userResult.insertId;

        // Create farmer profile automatically
        if (role === "farmer") {
            const farmerId =
                `FAR-${String(userId).padStart(4, "0")}`;

            await db.query(
                `INSERT INTO farmers
                (user_id, farmer_id, village)
                VALUES (?, ?, ?)`,
                [
                    userId,
                    farmerId,
                    village || null
                ]
            );
        }

        res.status(201).json({
            message: "Account created successfully",

            user: {
                id: userId,
                name,
                phone,
                role
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            error: "Registration failed"
        });
    }
});

// =====================================================
// LOGIN
// =====================================================

app.post("/api/auth/login", async (req, res) => {
    try {
        const {
            phone,
            password
        } = req.body;

        if (!phone || !password) {
            return res.status(400).json({
                error: "Phone and password are required"
            });
        }

        const [users] = await db.query(
            `SELECT
                id,
                name,
                phone,
                password,
                role
             FROM users
             WHERE phone = ?`,
            [phone]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: "Invalid phone number or password"
            });
        }

        const user = users[0];

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {
            return res.status(401).json({
                error: "Invalid phone number or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            message: "Login successful",

            token,

            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            error: "Login failed"
        });
    }
});

// =====================================================
// GET CENTRES
// =====================================================

app.get("/api/centres", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT
                id,
                name,
                location,
                capacity,
                contact,
                created_at
             FROM centres
             ORDER BY name`
        );

        const centres = rows.map((centre) => ({
            ...centre,

            // Current queue information
            avg_minutes: 10,
            current_token: 0,
            last_token: 0
        }));

        res.json(centres);

    } catch (error) {
        console.error("Centres error:", error);

        res.status(500).json({
            error: "Failed to fetch centres"
        });
    }
});

// =====================================================
// GET SLOTS
// =====================================================

app.get("/api/slots", async (req, res) => {
    try {
        const {
            centre_id,
            date
        } = req.query;

        if (!centre_id || !date) {
            return res.status(400).json({
                error: "centre_id and date are required"
            });
        }

        // Check whether slots already exist
        const [existingSlots] = await db.query(
            `SELECT
                id,
                centre_id,
                slot_date,
                start_time,
                end_time,
                capacity,
                booked,
                status
             FROM slots
             WHERE centre_id = ?
             AND slot_date = ?
             ORDER BY start_time`,
            [
                centre_id,
                date
            ]
        );

        // If slots already exist, return them
        if (existingSlots.length > 0) {
            return res.json(existingSlots);
        }

        // Default slot timings
        const defaultSlots = [
            ["09:00:00", "10:00:00"],
            ["10:00:00", "11:00:00"],
            ["11:00:00", "12:00:00"],
            ["12:00:00", "13:00:00"],
            ["14:00:00", "15:00:00"]
        ];

        // Automatically create slots
        // whenever a new date is selected
        for (const [startTime, endTime] of defaultSlots) {
            await db.query(
                `INSERT INTO slots
                (
                    centre_id,
                    slot_date,
                    start_time,
                    end_time,
                    capacity,
                    booked,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    centre_id,
                    date,
                    startTime,
                    endTime,
                    20,
                    0,
                    "available"
                ]
            );
        }

        // Fetch newly created slots
        const [newSlots] = await db.query(
            `SELECT
                id,
                centre_id,
                slot_date,
                start_time,
                end_time,
                capacity,
                booked,
                status
             FROM slots
             WHERE centre_id = ?
             AND slot_date = ?
             ORDER BY start_time`,
            [
                centre_id,
                date
            ]
        );

        res.json(newSlots);

    } catch (error) {
        console.error("Slots error:", error);

        res.status(500).json({
            error: "Failed to fetch slots"
        });
    }
});

// =====================================================
// GET BOOKINGS
// =====================================================

app.get("/api/bookings", async (req, res) => {
    try {
        const {
            centre_id,
            slot_id
        } = req.query;
        let sql = `
            SELECT
                b.id,
                b.farmer_id,
                s.centre_id,
                b.slot_id,
                b.token_number,
                b.booking_time,
                b.status
            FROM bookings b
            JOIN slots s
                ON b.slot_id = s.id
            WHERE 1 = 1
        `;

        const params = [];

        if (centre_id) {
            sql += `
                AND s.centre_id = ?
            `;

            params.push(centre_id);
        }
        if (slot_id) {
             sql += `
                AND b.slot_id = ?
                    `;
                params.push(slot_id);
                }

        sql += `
            ORDER BY CAST(
                REPLACE(b.token_number, 'A-', '')
                AS UNSIGNED
            )
        `;

        const [rows] =
            await db.query(sql, params);

        res.json(rows);

    } catch (error) {
        console.error("Bookings error:", error);

        res.status(500).json({
            error: "Failed to fetch bookings"
        });
    }
});

// =====================================================
// GET FARMER BOOKINGS
// =====================================================

// =====================================================
// GET BOOKINGS
// =====================================================

app.get("/api/bookings", async (req, res) => {
    try {
        const {
            centre_id,
            slot_id
        } = req.query;

        let sql = `
            SELECT
                b.id,
                b.farmer_id,
                s.centre_id,
                b.slot_id,
                b.token_number,
                b.booking_time,
                b.status
            FROM bookings b
            JOIN slots s
                ON b.slot_id = s.id
            WHERE 1 = 1
        `;

        const params = [];

        // Filter by centre
        if (centre_id) {
            sql += `
                AND s.centre_id = ?
            `;

            params.push(centre_id);
        }

        // Filter by slot
        if (slot_id) {
            sql += `
                AND b.slot_id = ?
            `;

            params.push(slot_id);
        }

        // Sort by token number
        sql += `
            ORDER BY CAST(
                REPLACE(b.token_number, 'A-', '')
                AS UNSIGNED
            )
        `;

        const [rows] = await db.query(sql, params);

        res.json(rows);

    } catch (error) {
        console.error("Bookings error:", error);

        res.status(500).json({
            error: "Failed to fetch bookings"
        });
    }
});
// =====================================================
// CREATE BOOKING
// =====================================================

app.post("/api/bookings", async (req, res) => {

    const connection =
        await db.getConnection();

    try {

        const {
            farmer_id,
            slot_id
        } = req.body;

        if (!farmer_id || !slot_id) {
            return res.status(400).json({
                error:
                    "farmer_id and slot_id are required"
            });
        }

        // -------------------------------------------------
        // START TRANSACTION
        // -------------------------------------------------

        await connection.beginTransaction();

        // -------------------------------------------------
        // GET FARMER PROFILE
        //
        // frontend sends users.id
        // bookings table uses farmers.id
        // -------------------------------------------------

        const [farmers] =
            await connection.query(
                `SELECT
                    id,
                    user_id,
                    farmer_id
                 FROM farmers
                 WHERE user_id = ?`,
                [farmer_id]
            );

        if (farmers.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                error: "Farmer profile not found"
            });
        }

        const farmer = farmers[0];

        const actualFarmerId = farmer.id;

        // -------------------------------------------------
        // GET SELECTED SLOT
        // -------------------------------------------------

        const [slots] =
            await connection.query(
                `SELECT
                    id,
                    centre_id,
                    capacity,
                    booked,
                    status
                 FROM slots
                 WHERE id = ?
                 FOR UPDATE`,
                [slot_id]
            );

        if (slots.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                error: "Slot not found"
            });
        }

        const slot = slots[0];

        // -------------------------------------------------
        // CHECK SLOT STATUS
        // -------------------------------------------------

        if (slot.status !== "available") {

            await connection.rollback();

            return res.status(400).json({
                error: "This slot is not available"
            });
        }

        // -------------------------------------------------
        // CHECK CAPACITY
        // -------------------------------------------------

        if (slot.booked >= slot.capacity) {

            await connection.rollback();

            return res.status(400).json({
                error: "This slot is full"
            });
        }

        // -------------------------------------------------
        // PREVENT DUPLICATE ACTIVE BOOKING
        // -------------------------------------------------

        const [existing] =
            await connection.query(
                `SELECT id
                 FROM bookings
                 WHERE farmer_id = ?
                 AND slot_id = ?
                 AND status NOT IN ('completed', 'cancelled')`,
                [
                    actualFarmerId,
                    slot_id
                ]
            );

        if (existing.length > 0) {

            await connection.rollback();

            return res.status(409).json({
                error:
                    "You already have a booking for this slot"
            });
        }

        // -------------------------------------------------
        // GENERATE TOKEN
        // -------------------------------------------------

        const [lastBooking] =
            await connection.query(
                `SELECT
                    b.token_number
                 FROM bookings b
                 JOIN slots s
                    ON b.slot_id = s.id
                 WHERE s.centre_id = ?
                 AND DATE(b.booking_time) = CURDATE()
                 ORDER BY b.id DESC
                 LIMIT 1`,
                [slot.centre_id]
            );

        let nextToken = 1;

        if (lastBooking.length > 0) {

            const lastToken =
                String(
                    lastBooking[0].token_number
                ).replace("A-", "");

            const number =
                parseInt(lastToken, 10);

            if (!isNaN(number)) {
                nextToken = number + 1;
            }
        }

        const tokenNumber =
            `A-${String(nextToken).padStart(3, "0")}`;

        // -------------------------------------------------
        // INSERT BOOKING
        // -------------------------------------------------

        const [bookingResult] =
            await connection.query(
                `INSERT INTO bookings
                (
                    farmer_id,
                    slot_id,
                    token_number,
                    status
                )
                VALUES (?, ?, ?, 'booked')`,
                [
                    actualFarmerId,
                    slot_id,
                    tokenNumber
                ]
            );

        // -------------------------------------------------
        // INCREASE SLOT BOOKED COUNT
        // -------------------------------------------------

        const newBooked =
            Number(slot.booked || 0) + 1;

        const newStatus =
            newBooked >= slot.capacity
                ? "full"
                : "available";

        await connection.query(
            `UPDATE slots
             SET booked = ?,
                 status = ?
             WHERE id = ?`,
            [
                newBooked,
                newStatus,
                slot_id
            ]
        );

        // -------------------------------------------------
        // CREATE APP NOTIFICATION
        // -------------------------------------------------

        await connection.query(
            `INSERT INTO notifications
            (
                user_id,
                booking_id,
                type,
                title,
                message,
                status
            )
            VALUES (?, ?, 'app', ?, ?, 'pending')`,
            [
                farmer.user_id,
                bookingResult.insertId,
                "Slot Booked Successfully",
                `Your slot has been booked successfully. Your token number is ${tokenNumber}.`
            ]
        );

        // -------------------------------------------------
        // COMMIT TRANSACTION
        // -------------------------------------------------

        await connection.commit();

        // -------------------------------------------------
        // RESPONSE
        // -------------------------------------------------

        res.status(201).json({

            message:
                "Slot booked successfully",

            booking: {

                id: bookingResult.insertId,

                // Return USER ID to frontend
                farmer_id: Number(farmer.user_id),

                centre_id:
                    slot.centre_id,

                slot_id:
                    Number(slot_id),

                token_number:
                    tokenNumber,

                status:
                    "booked"
            }
        });

    } catch (error) {

        await connection.rollback();

        console.error(
            "Booking error:",
            error
        );

        res.status(500).json({
            error: "Booking failed"
        });

    } finally {

        connection.release();
    }
});

// =====================================================
// MARK BOOKING AS ARRIVED
// =====================================================

app.patch(
    "/api/bookings/:id/arrive",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const [result] =
                await db.query(
                    `UPDATE bookings
                     SET status = 'waiting'
                     WHERE id = ?
                     AND status = 'booked'`,
                    [id]
                );

            if (result.affectedRows === 0) {

                return res.status(400).json({
                    error:
                        "Booking not found or already updated"
                });
            }

            const [rows] =
                await db.query(
                    `SELECT
                        b.id,
                        b.farmer_id,
                        s.centre_id,
                        b.slot_id,
                        b.token_number,
                        b.booking_time,
                        b.status
                     FROM bookings b
                     JOIN slots s
                        ON b.slot_id = s.id
                     WHERE b.id = ?`,
                    [id]
                );

            res.json({

                message:
                    "Marked as arrived",

                booking:
                    rows[0]
            });

        } catch (error) {

            console.error(
                "Arrival error:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to mark arrival"
            });
        }
    }
);

// =====================================================
// NOTIFICATIONS
// =====================================================

// Get notifications for a farmer

app.get(
    "/api/notifications/:user_id",
    async (req, res) => {

        try {

            const {
                user_id
            } = req.params;

            const [rows] =
                await db.query(
                    `SELECT
                        id,
                        user_id,
                        booking_id,
                        type,
                        title,
                        message,
                        status,
                        sent_at,
                        created_at
                     FROM notifications
                     WHERE user_id = ?
                     AND type = 'app'
                     ORDER BY created_at DESC`,
                    [user_id]
                );

            res.json(rows);

        } catch (error) {

            console.error(
                "Notifications error:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to fetch notifications"
            });
        }
    }
);

// =====================================================
// MARK NOTIFICATION AS READ
// =====================================================

app.patch(
    "/api/notifications/:id/read",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            await db.query(
                `UPDATE notifications
                 SET status = 'sent',
                     sent_at = CURRENT_TIMESTAMP
                 WHERE id = ?
                 AND type = 'app'`,
                [id]
            );

            res.json({
                message:
                    "Notification marked as read"
            });

        } catch (error) {

            console.error(
                "Notification update error:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to update notification"
            });
        }
    }
);
// =====================================================
// STAFF QUEUE UPDATE
// =====================================================

app.patch("/api/bookings/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = [
            "booked",
            "waiting",
            "serving",
            "completed",
            "cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                error: "Invalid booking status"
            });
        }

        const [result] = await db.query(
            `UPDATE bookings
             SET status = ?
             WHERE id = ?`,
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Booking not found"
            });
        }

        const [rows] = await db.query(
            `SELECT
                b.id,
                b.farmer_id,
                s.centre_id,
                b.slot_id,
                b.token_number,
                b.booking_time,
                b.status
             FROM bookings b
             JOIN slots s
                 ON b.slot_id = s.id
             WHERE b.id = ?`,
            [id]
        );

        res.json(rows[0]);

    } catch (error) {
        console.error("Staff status update error:", error);

        res.status(500).json({
            error: "Failed to update booking status"
        });
    }
});
// =====================================================
// UPDATE CENTRE CURRENT TOKEN
// =====================================================

app.patch("/api/centres/:id/current-token", async (req, res) => {
    try {
        const { id } = req.params;
        const { current_token } = req.body;

        const token = Number(current_token);

        if (!Number.isInteger(token) || token < 0) {
            return res.status(400).json({
                error: "Invalid current token"
            });
        }

        const [result] = await db.query(
            `UPDATE centres
             SET current_token = ?
             WHERE id = ?`,
            [token, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Centre not found"
            });
        }

        res.json({
            message: "Current token updated",
            current_token: token
        });

    } catch (error) {
        console.error("Current token update error:", error);

        res.status(500).json({
            error: "Failed to update current token"
        });
    }
});

// =====================================================
// START SERVER
// =====================================================

const PORT =
    process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(
        `AgroNex backend running on http://localhost:${PORT}`
    );

});
