import { Request, Response, NextFunction } from "express";
import Joi from "joi";
export interface ValidationError {
    field: string;
    message: string;
}
export declare class ValidationMiddleware {
    static validate(schema: Joi.ObjectSchema, property?: "body" | "query" | "params"): (req: Request, res: Response, next: NextFunction) => void;
    static validateQuery(schema: Joi.ObjectSchema): (req: Request, res: Response, next: NextFunction) => void;
    static validateParams(schema: Joi.ObjectSchema): (req: Request, res: Response, next: NextFunction) => void;
    static validateBody(schema: Joi.ObjectSchema): (req: Request, res: Response, next: NextFunction) => void;
    static createSchema(): {
        id: Joi.StringSchema<string>;
        email: Joi.StringSchema<string>;
        password: Joi.StringSchema<string>;
        phone: Joi.StringSchema<string>;
        date: Joi.DateSchema<Date>;
        pagination: Joi.ObjectSchema<any>;
        student: {
            create: Joi.ObjectSchema<any>;
            update: Joi.ObjectSchema<any>;
        };
        instructor: {
            create: Joi.ObjectSchema<any>;
            update: Joi.ObjectSchema<any>;
        };
        classTemplate: {
            create: Joi.ObjectSchema<any>;
            update: Joi.ObjectSchema<any>;
        };
        auth: {
            login: Joi.ObjectSchema<any>;
            register: Joi.ObjectSchema<any>;
        };
    };
}
