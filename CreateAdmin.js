import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Admin from './models/AdminModel.js';

// Connect to MongoDB
mongoose.connect('mongodb+srv://naman13399:naman13399@landacers.jy24n.mongodb.net/?retryWrites=true&w=majority&appName=LandAcers', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).catch(err => console.error('MongoDB connection error:', err));

const createAdmin = async (adminData) => {
    try {
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: adminData.email });
        if (existingAdmin) {
            throw new Error('Admin already exists with this email');
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminData.password, salt);

        // Create new admin object
        const newAdmin = new Admin({
            name: adminData.name,
            email: adminData.email,
            password: hashedPassword,
            phoneNumber: adminData.phoneNumber
        });

        // Save admin to database
        const savedAdmin = await newAdmin.save();
        
        // Return admin without password
        const { password, ...adminWithoutPassword } = savedAdmin.toObject();
        return adminWithoutPassword;

    } catch (error) {
        throw new Error(`Error creating admin: ${error.message}`);
    }
};

// Wait for MongoDB connection before creating admin
mongoose.connection.once('open', () => {
    console.log('MongoDB connected successfully');
    
    createAdmin({
        name: 'Naman',
        email: 'naman13399@gmail.com',
        password: 'Naman@13399',
        phoneNumber: '7000610047'
    }).then(admin => {
        console.log('Admin created:', admin);
        mongoose.connection.close();
    }).catch(error => {
        console.error('Error creating admin:', error.message);
        mongoose.connection.close();
    });
});
