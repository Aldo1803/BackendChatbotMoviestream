import pkg from 'oracledb';
const { OUT_FORMAT_OBJECT, getConnection } = pkg;

export async function runQuery(query) {
    let connection;

    try {

        query = query.trim().replace(/;$/, '');
        query = query.trim().replace(/(\r\n|\n|\r)/gm, '');
        // Establish a connection to the Oracle database
        connection = await getConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectionString: process.env.DB_CONNECTION_STRING
        });

        // Execute the query
        const result = await connection.execute(query, {}, { outFormat: OUT_FORMAT_OBJECT });
        return result.rows;
    } catch (error) {
        // Handle and log errors
        console.error('Error running query:', error);
        throw error;
    } finally {
        // Ensure the connection is always closed, even if an error occurs
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error('Error closing connection:', error);
            }
        }
    }
}

