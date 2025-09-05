import { Application } from './core/Application.js';
import config from './config/index.js';
const app = new Application(config);
async function bootstrap() {
    try {
        await app.start();
    }
    catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
}
bootstrap();
