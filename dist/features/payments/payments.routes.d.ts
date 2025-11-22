import { Router } from "express";
import { PaymentsController } from "./payments.controller.js";
import { AuthMiddleware } from "../auth/middleware/AuthMiddleware.js";
export declare function createPaymentsRoutes(paymentsController: PaymentsController, authMiddleware: AuthMiddleware): Router;
