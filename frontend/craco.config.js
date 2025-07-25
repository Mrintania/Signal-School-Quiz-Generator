// craco.config.js
module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // ปิด source map ใน development
            if (process.env.GENERATE_SOURCEMAP === 'false') {
                webpackConfig.devtool = false;
            }

            return webpackConfig;
        }
    },
    devServer: (devServerConfig) => {
        // แก้ไขปัญหา webpack-dev-server
        if (devServerConfig.onAfterSetupMiddleware) {
            delete devServerConfig.onAfterSetupMiddleware;
        }
        if (devServerConfig.onBeforeSetupMiddleware) {
            delete devServerConfig.onBeforeSetupMiddleware;
        }

        // ใช้ setupMiddlewares แทน
        devServerConfig.setupMiddlewares = (middlewares, devServer) => {
            if (!devServer) {
                throw new Error('webpack-dev-server is not defined');
            }

            return middlewares;
        };

        // กำหนดค่าเพิ่มเติม
        devServerConfig.client = {
            overlay: {
                errors: true,
                warnings: false,
            },
        };

        devServerConfig.historyApiFallback = {
            disableDotRule: true,
        };

        return devServerConfig;
    }
};