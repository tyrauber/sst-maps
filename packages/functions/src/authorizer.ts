export const main = async (event) => {
    // Get authorization header
    const authHeader = event.headers.authorization;
  
    // Parse for username and password
    let username, password;
    if (authHeader) {
      const base64Info = authHeader.split(" ")[1];
      // Stored as 'username:password' in base64
      const userInfo = Buffer.from(base64Info, "base64").toString();
      [username, password] = userInfo.split(":");
    }
  
    return {
      isAuthorized: username === "admin" && password === "password",
      context: {
        username,
      },
    };
  };

// const jwt = require('jsonwebtoken');
// const SECRET = 'your_jwt_secret';

// exports.handler = async (event) => {
//   const request = event.Records[0].cf.request;
//   const headers = request.headers;

//   try {
//     const token = headers.authorization[0].value.split(' ')[1];
//     jwt.verify(token, SECRET);
//   } catch (error) {
//     return {
//       status: '401',
//       statusDescription: 'Unauthorized',
//       body: 'Invalid or missing JWT token',
//     };
//   }

//   return request;
// };