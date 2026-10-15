const { pool } = require('./src/config/database');

async function seedCandidates() {
  const connection = await pool.getConnection();
  try {
    console.log('Seeding diverse candidates for search and filter testing...');
    
    // Get existing recruitment requests
    const [reqs] = await connection.query('SELECT id, position_id, department_id, recruiter_id FROM recruitment_requests');
    if (reqs.length === 0) {
      console.log('No recruitment requests found.');
      return;
    }

    const req1 = reqs[0].id;
    const req2 = reqs.length > 1 ? reqs[1].id : req1;
    const recruiterId = reqs[0].recruiter_id || 9;

    const dummyCandidates = [
      {
        name: 'Lê Hoàng Nam',
        email: 'nam.le@gmail.com',
        phone: '0901234567',
        status: 'INTERVIEWING',
        stage: 'INTERVIEW',
        source: 'LINKEDIN',
        reqId: req1,
        skills: 'NodeJS, Express, MySQL, Redis, AWS',
        rating: 4,
        talentPool: 1,
        tags: 'Backend,NodeJS,AWS,Senior',
        date: '2026-10-01 09:30:00'
      },
      {
        name: 'Phạm Minh Tuấn',
        email: 'tuan.pham@outlook.com',
        phone: '0934567890',
        status: 'NEW',
        stage: 'SCREENING',
        source: 'REFERRAL',
        reqId: req1,
        skills: 'React, TypeScript, NextJS, Redux',
        rating: 4,
        talentPool: 0,
        tags: 'Frontend,React,TypeScript',
        date: '2026-10-05 14:15:00'
      },
      {
        name: 'Đặng Thu Thảo',
        email: 'thao.dang@gmail.com',
        phone: '0945678901',
        status: 'OFFERED',
        stage: 'OFFER',
        source: 'LINKEDIN',
        reqId: req2,
        skills: 'Figma, UI/UX, Design System, CSS3',
        rating: 5,
        talentPool: 1,
        tags: 'UI/UX,Design System,Tiếng Anh Tốt',
        date: '2026-09-20 10:00:00'
      },
      {
        name: 'Vũ Quốc Bảo',
        email: 'bao.vu@yahoo.com',
        phone: '0978901234',
        status: 'HIRED',
        stage: 'HIRED',
        source: 'FACEBOOK',
        reqId: req1,
        skills: 'Python, Django, PostgreSQL, Docker',
        rating: 5,
        talentPool: 0,
        tags: 'Backend,Python,Docker,Senior',
        date: '2026-09-15 16:45:00'
      },
      {
        name: 'Bùi Phương Linh',
        email: 'linh.bui@gmail.com',
        phone: '0981234567',
        status: 'REJECTED',
        stage: 'REJECTED',
        source: 'FACEBOOK',
        reqId: req2,
        skills: 'HTML, CSS, JavaScript cơ bản',
        rating: 2,
        talentPool: 0,
        tags: 'Junior,Frontend,Không phù hợp kinh nghiệm',
        date: '2026-09-25 11:20:00'
      },
      {
        name: 'Hoàng Văn Dũng',
        email: 'dung.hoang@company.com',
        phone: '0962345678',
        status: 'NEW',
        stage: 'NEW',
        source: 'LINKEDIN',
        reqId: req1,
        skills: 'Java, Spring Boot, Microservices, Kafka',
        rating: 4,
        talentPool: 1,
        tags: 'Backend,Java,Microservices,Tiếng Anh Tốt',
        date: '2026-10-10 08:30:00'
      },
      {
        name: 'Ngô Thanh Vân',
        email: 'van.ngo@gmail.com',
        phone: '0918765432',
        status: 'INTERVIEWING',
        stage: 'INTERVIEW',
        source: 'REFERRAL',
        reqId: req2,
        skills: 'React, VueJS, TailwindCSS, REST API',
        rating: 4,
        talentPool: 0,
        tags: 'Frontend,React,VueJS',
        date: '2026-10-11 13:40:00'
      },
      {
        name: 'Trịnh Công Sơn',
        email: 'son.trinh@gmail.com',
        phone: '0929876543',
        status: 'NEW',
        stage: 'NEW',
        source: 'LINKEDIN',
        reqId: req1,
        skills: 'Golang, Kubernetes, CI/CD, MySQL',
        rating: 5,
        talentPool: 1,
        tags: 'DevOps,Golang,Cloud,Senior',
        date: '2026-10-14 15:10:00'
      },
      {
        name: 'Đỗ Mỹ Linh',
        email: 'linh.domy@gmail.com',
        phone: '0938765432',
        status: 'NEW',
        stage: 'SCREENING',
        source: 'FACEBOOK',
        reqId: req2,
        skills: 'Content Marketing, SEO, Social Media, Copywriting',
        rating: 3,
        talentPool: 0,
        tags: 'Marketing,SEO,Junior',
        date: '2026-10-14 17:00:00'
      }
    ];

    for (const c of dummyCandidates) {
      const [exists] = await connection.query('SELECT id FROM candidates WHERE email = ?', [c.email]);
      if (exists.length === 0) {
        await connection.query(`
          INSERT INTO candidates 
            (full_name, email, phone, status, current_stage, source_code, recruitment_request_id, cv_file_path, parsed_skills, rating, is_talent_pool, tags, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, '/uploads/cvs/sample_cv_nguyen_van_an.pdf', ?, ?, ?, ?, ?, ?)
        `, [c.name, c.email, c.phone, c.status, c.stage, c.source, c.reqId, c.skills, c.rating, c.talentPool, c.tags, recruiterId, c.date]);
      }
    }

    console.log('Successfully seeded dummy candidates.');
  } catch (err) {
    console.error('Error seeding candidates:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seedCandidates();

