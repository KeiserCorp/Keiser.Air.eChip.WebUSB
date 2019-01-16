export default class Logger {
    static info(message?: any): void;
    static warn(message?: any): void;
    static error(message?: any): void;
    private static enabled;
}
