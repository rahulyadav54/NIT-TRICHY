import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'udyamflow_jwt_secret_default_key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  company: {
    name: process.env.COMPANY_NAME || 'TRIMA Packaged Foods Pvt Ltd',
    gstin: process.env.COMPANY_GSTIN || '33AABCT1234F1Z5',
    state: process.env.COMPANY_STATE || 'Tamil Nadu',
    stateCode: process.env.COMPANY_STATE_CODE || '33',
    address: process.env.COMPANY_ADDRESS || 'B-12, Industrial Estate, Thuvakudi, Tiruchirappalli, Tamil Nadu - 620015',
    phone: process.env.COMPANY_PHONE || '+91 94431 00000',
    email: process.env.COMPANY_EMAIL || 'admin@trima-foods.com',
  },
};

