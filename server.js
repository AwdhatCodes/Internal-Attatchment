const mongoose = require('mongoose');
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

// Express setup
const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const initializePassport = require("./passport-config");
const User = require('./models/user'); // Import User model
const Activity = require('./models/activity'); // Import Activity model
const Inventory = require('./models/inventory'); // Import Inventory model
const Room = require('./models/Room'); // Import Room model

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(error => console.error('Error connecting to MongoDB:', error));

const db = mongoose.connection;
db.on('error', error => console.error(error));
db.once('open', () => console.log('Connected to MongoDB Atlas'));

initializePassport(
    passport,
    async email => await User.findOne({ email: email }),
    async id => await User.findOne({ id: id })
);

// Middleware setup
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // Add this line to parse JSON bodies
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET, // Provide the secret option here
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');

// Routes

app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.render("index.ejs", { name: null });
    }
});

app.get('/login', (req, res) => {
    let messages = {};
    if (req.flash('error').length) {
        messages.error = req.flash('error')[0];
    }
    res.render("login.ejs", { messages: messages });
});

app.get('/register', (req, res) => {
    let messages = {};
    if (req.flash('error').length) {
        messages.error = req.flash('error')[0];
    }
    res.render("register.ejs", { messages: messages });
});

app.get('/dashboard', checkAuthenticated, async (req, res) => {
    try {
        const activities = await Activity.find({ userId: req.user._id }).sort({ timestamp: -1 }).limit(5);
        
        // Fetch inventory data and calculate counts
        const inventoryItems = await Inventory.find({ userId: req.user._id });
        const seedCount = inventoryItems.filter(item => item.type === 'Seed').length;
        const germplasmCount = inventoryItems.filter(item => item.type === 'Germplasm').length;

        res.render('dashboard', {
            user: req.user,
            activities,
            seedCount,
            germplasmCount
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

app.get('/inventory', checkAuthenticated, async (req, res) => {
    try {
        const inventoryItems = await Inventory.find({ userId: req.user._id });
        res.render('inventory', { user: req.user, inventoryItems });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

app.get('/catalog', checkAuthenticated, (req, res) => {
    res.render('catalog', { user: req.user });
});

app.get('/analytics', checkAuthenticated, (req, res) => {
    res.render('analytics', { user: req.user });
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true
}));

app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) {
            console.error(err);
            return next(err);
        }
        res.redirect('/');
    });
});

app.post("/register", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
        });
        await user.save();
        console.log(user);
        res.redirect("/login");
    } catch (e) {
        console.log(e);
        req.flash('error', 'Registration error');
        res.redirect("/register");
    }
});

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    next();
}

app.get('/profile', checkAuthenticated, (req, res) => {
    res.render('profile', { user: req.user });
});

app.get('/settings', checkAuthenticated, (req, res) => {
    res.render('settings', { user: req.user });
});

app.get('/rooms', checkAuthenticated, (req, res) => {
    res.render('rooms', { user: req.user });
});

// Room API routes
app.get('/api/rooms', checkAuthenticated, async (req, res) => {
    const rooms = await Room.find({ userId: req.user._id });
    res.json(rooms);
});

app.post('/api/rooms', checkAuthenticated, async (req, res) => {
    const room = new Room({ ...req.body, userId: req.user._id });
    await room.save();
    res.json(room);
});

app.delete('/api/rooms/:id', checkAuthenticated, async (req, res) => {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: 'Room deleted' });
});

app.put('/api/rooms/:id', checkAuthenticated, async (req, res) => {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(room);
});

// Inventory item view and delete routes
app.get('/view-item/:id', checkAuthenticated, async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id);
        if (!item) {
            return res.status(404).send('Item not found');
        }
        res.render('view-item', { user: req.user, item });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

app.delete('/delete-item/:id', checkAuthenticated, async (req, res) => {
    try {
        const result = await Inventory.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).send('Item not found');
        }
        res.status(200).send('Item deleted');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Add new item route
app.get('/add-item', checkAuthenticated, (req, res) => {
    res.render('add-item', { user: req.user });
});

app.post('/add-item', checkAuthenticated, async (req, res) => {
    try {
        const { itemName, type, quantity, description } = req.body;
        const newItem = new Inventory({
            itemName,
            type,
            quantity,
            description,
            userId: req.user._id,
            timestamp: new Date()
        });
        await newItem.save();
        res.redirect('/inventory'); // Redirect to the inventory page after adding the item
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
