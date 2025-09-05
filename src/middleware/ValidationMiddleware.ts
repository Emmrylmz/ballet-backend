import { Request, Response, NextFunction } from "express";
import Joi from "joi";

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationMiddleware {
  static validate(
    schema: Joi.ObjectSchema,
    property: "body" | "query" | "params" = "body"
  ) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
      });
      console.log(error);
      if (error) {
        const errors: ValidationError[] = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        }));

        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
        return;
      }

      // Only set if the property is settable (avoid readonly properties)
      if (
        property === "body" ||
        (property === "query" && Object.isExtensible(req))
      ) {
        try {
          (req as any)[property] = value;
        } catch (error) {
          // If we can't set it, just continue - validation passed anyway
        }
      }
      next();
    };
  }

  static validateQuery(schema: Joi.ObjectSchema) {
    return this.validate(schema, "query");
  }

  static validateParams(schema: Joi.ObjectSchema) {
    return this.validate(schema, "params");
  }

  static validateBody(schema: Joi.ObjectSchema) {
    return this.validate(schema, "body");
  }

  static createSchema() {
    return {
      // Common validation schemas
      id: Joi.string().uuid().required(),
      email: Joi.string().email().required(),
      password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required(),
      phone: Joi.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .optional(),
      date: Joi.date().iso().required(),
      pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sort: Joi.string().optional(),
        order: Joi.string().valid("asc", "desc").default("asc"),
      }),

      // Student schemas
      student: {
        create: Joi.object({
          firstName: Joi.string().min(2).max(50).required(),
          lastName: Joi.string().min(2).max(50).required(),
          email: Joi.string().email().required(),
          phone: Joi.string()
            .pattern(/^\+?[1-9]\d{1,14}$/)
            .optional(),
          dateOfBirth: Joi.date().max("now").required(),
          emergencyContact: Joi.object({
            name: Joi.string().min(2).max(100).required(),
            phone: Joi.string()
              .pattern(/^\+?[1-9]\d{1,14}$/)
              .required(),
            relationship: Joi.string().min(2).max(50).required(),
          }).required(),
          medicalInfo: Joi.string().max(500).optional(),
          notes: Joi.string().max(1000).optional(),
        }),

        update: Joi.object({
          firstName: Joi.string().min(2).max(50).optional(),
          lastName: Joi.string().min(2).max(50).optional(),
          email: Joi.string().email().optional(),
          phone: Joi.string()
            .pattern(/^\+?[1-9]\d{1,14}$/)
            .optional(),
          dateOfBirth: Joi.date().max("now").optional(),
          emergencyContact: Joi.object({
            name: Joi.string().min(2).max(100).optional(),
            phone: Joi.string()
              .pattern(/^\+?[1-9]\d{1,14}$/)
              .optional(),
            relationship: Joi.string().min(2).max(50).optional(),
          }).optional(),
          medicalInfo: Joi.string().max(500).optional(),
          notes: Joi.string().max(1000).optional(),
          isActive: Joi.boolean().optional(),
        }).min(1),
      },

      // Instructor schemas
      instructor: {
        create: Joi.object({
          firstName: Joi.string().min(2).max(50).required(),
          lastName: Joi.string().min(2).max(50).required(),
          email: Joi.string().email().required(),
          phone: Joi.string()
            .pattern(/^\+?[1-9]\d{1,14}$/)
            .optional(),
          specialties: Joi.array().items(Joi.string()).min(1).required(),
          hourlyRate: Joi.number().positive().precision(2).required(),
          bio: Joi.string().max(1000).optional(),
          certifications: Joi.array().items(Joi.string()).optional(),
        }),

        update: Joi.object({
          firstName: Joi.string().min(2).max(50).optional(),
          lastName: Joi.string().min(2).max(50).optional(),
          email: Joi.string().email().optional(),
          phone: Joi.string()
            .pattern(/^\+?[1-9]\d{1,14}$/)
            .optional(),
          specialties: Joi.array().items(Joi.string()).min(1).optional(),
          hourlyRate: Joi.number().positive().precision(2).optional(),
          bio: Joi.string().max(1000).optional(),
          certifications: Joi.array().items(Joi.string()).optional(),
          isActive: Joi.boolean().optional(),
        }).min(1),
      },

      // Class template schemas
      classTemplate: {
        create: Joi.object({
          name: Joi.string().min(2).max(100).required(),
          description: Joi.string().max(500).optional(),
          duration: Joi.number().integer().positive().required(),
          capacity: Joi.number().integer().positive().required(),
          ageGroup: Joi.string()
            .valid("kids", "teens", "adults", "all")
            .required(),
          level: Joi.string()
            .valid("beginner", "intermediate", "advanced", "all")
            .required(),
          price: Joi.number().positive().precision(2).required(),
        }),

        update: Joi.object({
          name: Joi.string().min(2).max(100).optional(),
          description: Joi.string().max(500).optional(),
          duration: Joi.number().integer().positive().optional(),
          capacity: Joi.number().integer().positive().optional(),
          ageGroup: Joi.string()
            .valid("kids", "teens", "adults", "all")
            .optional(),
          level: Joi.string()
            .valid("beginner", "intermediate", "advanced", "all")
            .optional(),
          price: Joi.number().positive().precision(2).optional(),
          isActive: Joi.boolean().optional(),
        }).min(1),
      },

      // Auth schemas
      auth: {
        login: Joi.object({
          email: Joi.string().email().required(),
          password: Joi.string().required(),
        }),

        register: Joi.object({
          firstName: Joi.string().min(2).max(50).required(),
          lastName: Joi.string().min(2).max(50).required(),
          email: Joi.string().email().required(),
          password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .required(),
          role: Joi.string()
            .valid("admin", "instructor", "student")
            .default("student"),
        }),
      },
    };
  }
}
