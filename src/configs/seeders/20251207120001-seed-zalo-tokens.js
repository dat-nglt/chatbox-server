import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("zalo_tokens", [
        {
            access_token:
                "2xT9CftMrLKAjaizcDdVL0guGZ6JmRq5PDvO6AZUidzcud93_eEAQnMkOMBZl8X1SeTIVQYxi7znfozCeQ39K4caCrdGYz1_89S_PDc2tbeOj1XeqgB-01ou03Bwg_aH7fuYS_cmm70tXLyKfORASsYVC7lnggz2PRCo98IhtKLybH8aw8sA92AgR43kcP966OfePDIbYqmpX7TL_8gHIMohJdoKjgT1P81D8xo7s2jRj1SphxkE2MAUQ2kbheWYHff90TEYhpOZdKi5shcs81dNV3Y1xA41Oiix5k_Kqmm5zWOvvldPBGxx9qN7sjXU0yv7E_3DjI8xm6qKr-MnB2x_L174uuyYKinF8whebnjf-tq8kSlzFNtA9XgqwVmUGVfc3Oxxg2v9u6OckzZyEql071oPyuKQe5UjKP_ErLK",
            refresh_token:
                "ZqiuHgWYoHUEIZf9hIt35ev4CqMcDS1zpnblB8SWsHpLENCkYIJwSVSfSLYt0y1xr0zbJRmSasZxUWjxlsAxMvPd0M_tI99DZM0LRUnpkbkf6Gb4_oAROAWFE3J1DvaXlWqW8E44fI7675nmln3zH-qcHGsM5zG1iG9BKkeUr5kD1cDBmnQK0Ra11p7j4RK2jtS4NTTPzrAnSbm4n4dlAPfxLZdxKS8Be4r79jbntXwzMtCjbLJz6kT5LaYUUVeOjqHD2jKjmnIA7KH2utJzPyTlJ4QP0Bv9-safJO5vY1dvSWOLhKZq4_bn0qMXHAfbyMemQTDOWdllCND9g1JA0zq0S3JuPfqNi7yaC_valcAS2XSzlc2bCFrDDGVUIv5OhdSBH_9GcnQvHZO_SH5Vm6UgEiaN",
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
