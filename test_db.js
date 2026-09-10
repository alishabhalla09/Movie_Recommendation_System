const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:password@localhost:5432/mediahub' });
pool.query(`select "item_id", 
        SUM(
          CASE event_type
            WHEN 'purchase' THEN 5
            WHEN 'rate' THEN 4
            WHEN 'watch' THEN 3
            WHEN 'click' THEN 2
            ELSE 1
          END
          * GREATEST(0.1, 1.0 - EXTRACT(EPOCH FROM (NOW() - created_at)) / (72 * 3600))
        )
       as "score" from "interactions" where created_at >= NOW() - INTERVAL '3 days' group by "interactions"."item_id" order by score desc limit 60`, (err, res) => {
  console.log(err || 'SUCCESS!');
  pool.end();
});
