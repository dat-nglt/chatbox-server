import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("zalo_tokens", [
        {
            access_token:
                "fygE6XGpUIQcoumL4Jnp9wR5XHaQ901A_jkMSH8vF3R0cRLa1Z8s0E_DjMi0Rae5iSt8MGrbI1xzdyzw5MTXHg2Pdtnj1sv1eQtf1dS1Ps6ghV0x5YC7GSFSYdaHN1O_yVoQR4nZ7b2GxU0GNb8UBEhsaryPUWSxvVlo0GeDMJcx-zfa2dzEMUZct1aR44b4ngx4AtCqHqAJZT05MZ9wH9EkwNbEAs4gg93tQnWb12Z9teXE8YP-SEZGzp4FUbLZnjwc21j4KsFgvzDR0cvb8UhEyN8yTc8BwCoLI0n5OpBTmv5z4sGG5FESloWJ8o1m-AceCHy97alqh-W4FWfNHyoAeNuxD14NayAVKYzE6X2OjkvAP39V8PIxqHD50drzXOp-87KcTaYHYiWXLJ9OOxhE_J5FXS_62XOhUIO",
            refresh_token:
                "nPiQP9-rqLd4cXXhchhRMCIK4MUHefqbZ8C07QRliNUcbHiaekNLLVQH6GxquQ5zwSu46E-2Xt34wGiKsC2aA_AT7tgepTmPlkDkJRkMnmcGobP9kxdDBRNEJHM8b_X6liSt5B6mZdEloIGyyhkJO__t6bwdfPKd-l44MDZOjIBRgdnOnFpF9jsi1LZ4qhPg-wGv0wRGf525kYWHWUIUU8QGAJw9yPrTiTqsCUsmXGBAuXvhmxkE0PhM35sdghaUWSGIGh-PfYNhynvPyOtJ0VFNH3wgfSfvYSfeEv6ysdQMx6SqYwFGUTFS7ZNGzT5zxjHf6_UssdcZp7S8hgE-DvBlAWwaXA0paCHZSuootHEvy1Psx9-h4UdjAo_pfUX-wiXhGUkWotrBScmO-WkThT5P",
            access_token_expires_at: new Date(Date.now() + 3600000), // 1 hour from now
            refresh_token_expires_at: new Date(Date.now() + 7776000000), // 3 tháng từ now
            created_at: new Date(),
            updated_at: new Date(),
        },
    ]);
};

export const down = async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("zalo_tokens", null, {});
};
