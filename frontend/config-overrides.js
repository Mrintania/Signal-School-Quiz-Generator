// config-overrides.js
const { override, addWebpackModuleRule } = require('customize-cra');

module.exports = override(
    // ปิดการใช้งาน source map ใน development เพื่อลดขนาด
    (config) => {
        if (process.env.GENERATE_SOURCEMAP === 'false') {
            config.devtool = false;
        }

        // แก้ไขปัญหา webpack-dev-server
        if (config.devServer) {
            // ลบคุณสมบัติที่ไม่รองรับ
            delete config.devServer.onAfterSetupMiddleware;
            delete config.devServer.onBeforeSetupMiddleware;

            // ใช้ setupMiddlewares แทน
            config.devServer.setupMiddlewares = (middlewares, devServer) => {
                if (!devServer) {
                    throw new Error('webpack-dev-server is not defined');
                }

                return middlewares;
            };

            // กำหนดค่าที่จำเป็น
            config.devServer.client = {
                overlay: {
                    errors: true,
                    warnings: false,
                },
            };

            // ปิด live reload ถ้าต้องการ
            config.devServer.liveReload = true;
            config.devServer.hot = true;
        }

        return config;
    }
);