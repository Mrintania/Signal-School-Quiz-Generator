/**
 * Standard Response DTO
 * ใช้สำหรับ response format ที่เป็นมาตรฐาน
 */
export class ResponseDTO {
    constructor(success, data = null, message = '', errors = []) {
        this.success = success;
        this.data = data;
        this.message = message;
        this.timestamp = new Date().toISOString();

        if (errors.length > 0) {
            this.errors = errors;
        }
    }

    static success(data, message = 'Success') {
        return new ResponseDTO(true, data, message);
    }

    static error(message, errors = []) {
        return new ResponseDTO(false, null, message, errors);
    }
}