/**
 * ตั้งค่าตัวจัดการข้อผิดพลาดระดับสูงสุดของแอปพลิเคชัน
 */
export const setupGlobalErrorHandler = () => {
    // Handle uncaught exceptions
    window.addEventListener('error', (event) => {
        console.error('Global error caught:', event.error);

        // Log to analytics or error tracking service in production
        if (process.env.NODE_ENV === 'production') {
            // logErrorToService(event.error);
        }

        // Prevent the error from propagating
        event.preventDefault();
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);

        // Log to analytics or error tracking service in production
        if (process.env.NODE_ENV === 'production') {
            // logErrorToService(event.reason);
        }

        // Prevent the rejection from propagating
        event.preventDefault();
    });
};