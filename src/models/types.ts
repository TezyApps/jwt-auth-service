
export const Tables = { 
    users: "Users"
};

export interface User { 
    email: string;
    hashedPassword: string;
}

export const ErrorCode = { 
    loginInvalidCredentials: "Invalid Credentials",
    awsDBConditionalCheckFailedException: "ConditionalCheckFailedException"
}