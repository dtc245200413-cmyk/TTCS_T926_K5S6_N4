const { pool } = require('../src/config/database');

async function seedInterviewQuestions() {
  console.log('🚀 Đang khởi tạo bảng interview_questions và nạp 10 câu hỏi kiểm thử...');

  try {
    // 1. Tạo bảng interview_questions nếu chưa có
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interview_questions (
        question_id INT AUTO_INCREMENT PRIMARY KEY,
        criteria_id INT NOT NULL,
        question_content TEXT NOT NULL,
        difficulty_level ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
        good_answer_hint TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (criteria_id) REFERENCES competency_criteria(criteria_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('   ✓ Đã tạo/đảm bảo bảng interview_questions.');

    // 2. Lấy danh sách criteria_id có sẵn
    const [criteriaRows] = await pool.query('SELECT criteria_id, criteria_name FROM competency_criteria ORDER BY criteria_id ASC');
    if (criteriaRows.length === 0) {
      throw new Error('Chưa có tiêu chí năng lực trong competency_criteria.');
    }

    const c1 = criteriaRows[0]?.criteria_id; // Tiêu chí 1 (Thuật toán / Chuyên môn)
    const c2 = criteriaRows[1]?.criteria_id || c1; // Tiêu chí 2
    const c3 = criteriaRows[2]?.criteria_id || c1; // Tiêu chí 3
    const c4 = criteriaRows[3]?.criteria_id || c1; // Tiêu chí 4
    const c5 = criteriaRows[4]?.criteria_id || c1; // Tiêu chí 5

    // Xóa câu hỏi cũ để nạp mới chuẩn xác
    await pool.query('DELETE FROM interview_questions');

    // 3. 10 câu hỏi kiểm thử đặc trưng trải đều EASY, MEDIUM, HARD
    const sampleQuestions = [
      {
        criteriaId: c1,
        difficulty: 'EASY',
        content: 'Bạn hãy nêu sự khác biệt giữa synchronous (đồng bộ) và asynchronous (bất đồng bộ) trong lập trình?',
        hint: 'Ứng viên phân biệt rõ blocking I/O và non-blocking I/O. Nêu được ví dụ ứng dụng xử lý tác vụ bất đồng bộ như gọi API, đọc ghi file, truy vấn CSDL.'
      },
      {
        criteriaId: c2,
        difficulty: 'EASY',
        content: 'Cơ chế Index trong cơ sở dữ liệu quan hệ (RDBMS) hoạt động như thế nào và khi nào thì nên đánh Index?',
        hint: 'Ứng viên giải thích cấu trúc B-Tree Index, giúp tìm kiếm nhị phân với độ phức tạp O(log N). Cân nhắc trade-off khi ghi dữ liệu (INSERT/UPDATE) bị chậm hơn.'
      },
      {
        criteriaId: c3,
        difficulty: 'EASY',
        content: 'Khi gặp xung đột ý kiến với đồng nghiệp về giải pháp kỹ thuật, bạn sẽ xử lý như thế nào?',
        hint: 'Ứng viên thể hiện thái độ lắng nghe tích cực, thảo luận dựa trên dẫn chứng kỹ thuật (Trade-offs, Benchmark) và tôn trọng quyết định chung của tập thể.'
      },
      {
        criteriaId: c1,
        difficulty: 'MEDIUM',
        content: 'Hãy giải thích cơ chế Event Loop trong Node.js (Call Stack, Node APIs, Callback Queue, Microtask Queue).',
        hint: 'Ứng viên trình bày rõ thứ tự ưu tiên của process.nextTick, Promise.then (Microtask) trước khi thực thi macrotask (setTimeout, setImmediate, I/O callbacks).'
      },
      {
        criteriaId: c2,
        difficulty: 'MEDIUM',
        content: 'Nguyên lý hoạt động của Database Connection Pool là gì? Cần lưu ý những tham số cấu hình quan trọng nào?',
        hint: 'Giải thích việc tái sử dụng connection thay vì mở mới TCP handshake. Nêu rõ các tham số: min/max connections, connection timeout, idle timeout.'
      },
      {
        criteriaId: c4,
        difficulty: 'MEDIUM',
        content: 'Mô tả quy trình xây dựng đường ống CI/CD tự động từ khi lập trình viên push code đến lúc deploy Production.',
        hint: 'Quy trình chuẩn: Lint/Code Format -> Unit Test -> Docker Build -> SonarQube Scan -> Deploy Staging -> Automated Regression Test -> Zero-downtime Prod Deploy.'
      },
      {
        criteriaId: c5,
        difficulty: 'MEDIUM',
        content: 'Can you introduce yourself in English and describe the architecture of the most challenging project you have worked on?',
        hint: 'Ứng viên phát âm rõ ràng, sử dụng đúng thuật ngữ chuyên ngành (Microservices, Cache layer, Scalability), ngữ pháp tự tin và lưu loát.'
      },
      {
        criteriaId: c1,
        difficulty: 'HARD',
        content: 'Bạn sẽ tối ưu một câu truy vấn SQL bị nghẽn (slow query) trên bảng có hơn 20 triệu bản ghi như thế nào?',
        hint: 'Ứng viên sử dụng EXPLAIN ANALYZE, tối ưu Composite Index, tránh SELECT *, xử lý n+1 query, áp dụng Partitioning theo thời gian hoặc Read/Write Replica.'
      },
      {
        criteriaId: c2,
        difficulty: 'HARD',
        content: 'Khi thiết kế hệ thống Microservices phân tán, làm thế nào để đảm bảo tính nhất quán dữ liệu giữa các dịch vụ?',
        hint: 'Trình bày mô hình Saga Pattern (Choreography hoặc Orchestration), Outbox Pattern với Message Broker (Kafka/RabbitMQ) và nguyên lý Eventual Consistency.'
      },
      {
        criteriaId: c3,
        difficulty: 'HARD',
        content: 'Kể lại một sự cố lỗi nghiêm trọng trên Production bạn từng xử lý. Quy trình điều tra nguyên nhân gốc rễ (RCA) và biện pháp phòng ngừa là gì?',
        hint: 'Ứng viên trả lời theo mô hình STAR: Phân tích log/APM metrics, hotfix/rollback tức thời, thông báo stakeholder và viết tài liệu Post-mortem cải tiến hệ thống.'
      }
    ];

    for (const q of sampleQuestions) {
      await pool.query(`
        INSERT INTO interview_questions (criteria_id, question_content, difficulty_level, good_answer_hint)
        VALUES (?, ?, ?, ?)
      `, [q.criteriaId, q.content, q.difficulty, q.hint]);
    }

    console.log(`✅ Đã nạp thành công ${sampleQuestions.length} câu hỏi kiểm thử (3 Easy, 4 Medium, 3 Hard) vào Ngân hàng câu hỏi!`);
    await pool.end();
  } catch (err) {
    console.error('❌ Lỗi:', err);
    process.exit(1);
  }
}

seedInterviewQuestions();
