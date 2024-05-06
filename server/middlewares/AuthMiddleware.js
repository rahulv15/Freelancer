import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) return res.status(401).send("You are not authenticated!");
    jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
        if (err) return res.status(403).send("Token is not valid.");
        req.userId = payload?.userId;
        next();
    });
};

/**export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(authHeader)
    if (authHeader) {
        const token = authHeader.split(" ")[1]; 
        try{
        jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
            if (err) {
                console.error("Token verification error:", err);
                return res.status(403).send("Token is not valid.");
            }
            req.userId = payload.userId;
            next();
        });}
        catch(e){
            return "exception occured"
        }
    } else {
        return res.status(401).send("You are not authenticated!");
    }
};**/

