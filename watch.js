const FormData = require('form-data');
const axios  = require('axios');
const cheerio = require('cheerio');
const { parseString: ps } = require('xml2js');
const ProgressBar = require('progress')

const host = 'http://zust.cjnep.net';

const homeURL = `${host}/lms/web/course/index`;
const parseString = data => {
  return new Promise(resolve => {
    ps(data, (err, res) => resolve(res))
  })
}


/**
 * 创建formData
 * @param obj
 */
function genFormData(obj) {
  const formData = new FormData();
  formData.append('courseId', obj.courseId);
  formData.append('scoId', obj.scoId);
  formData.append('historyId', obj.historyId);
  formData.append('addTime', obj.addTime);
  formData.append('totalTime', obj.time);
  formData.append('currentTime', obj.time);
  return formData;
}

function sleep() {
  return new Promise(resolve => {
    setTimeout(resolve, 30000)
  })
}


/**
 * 更新课程
 * @param data
 * @param name
 * @param time
 */
async function updateCourse({ data, name, time }) {
  return new Promise(async resolve => {
    rl.on('line', () => {
      resolve()
    })
    const bar = new ProgressBar(`学习${name}，输入回车直接学习下一章: [:bar]`, {
      total: time,
      width: 50
    })
    try {
      for (let i = 0; i <= time; i += 30) {
        const formData = genFormData({
          courseId: data.courseId[0],
          scoId: data.scoId[0],
          historyId: data.historyId[0],
          time: time,
          addTime: 30
        });
        const res = await axios.post(
          `${host}/lms/web/timing/updstatus`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Cookie: cookie,
              'Content-Length': formData.getLengthSync(),
            },
          }
        )
        const obj = await parseString(res.data)
        if (obj.root.status[0] === '1') {
          bar.tick(30)
        }
        await sleep()
      }
      resolve()
    } catch (e) {
      console.log(e)
    }
  })
}

/**
 * 获取课程
 */
function fetchCourse() {
  return axios.get(homeURL, {
    headers: {
      Cookie: cookie
    }
  }).then(res => {
    console.log('登录成功');
    const $ = cheerio.load(res.data);
    const courseList = $('.courselist .row .mycourse a');
    const href = [];

    courseList.each(function () {
      const item = $(this);
      href.push(item.attr('href'));
    });

    return href;
  })
}

/**
 * 获取章节
 */
async function fetchChapter(href) {
  console.log('获取课程章节...')
  const res = await axios.get(`${host}${href}`, {
    headers: {
      Cookie: cookie
    }
  })
  const $ = cheerio.load(res.data);
  const courseList = $('.item');
  const chapter = [];

  courseList.each(function () {
    const item = $(this);
    chapter.push({
      href: item.attr('onclick').slice(17, -2),
      name: item.find('.namediv').text(),
      time: item.find('.date').text().split(':')[0] * 60
    });
  });

  for await (const c of chapter) {
    await getCourseInfo(c);
  }
}

/**
 * 获取课程信息
 */
async function getCourseInfo(chapter) {
  const res = await axios.get(`${host}${chapter.href}`, {
    headers: {
      Cookie: cookie
    }
  })
  const regExp = /\/lms\/web\/course\/startupxml\?courseid=[0-9]+&itemid=[0-9]+&historyid=([0-9]+)/;
  const matchResult = res.data.match(regExp);
  if (matchResult) {
    const res = await axios.get(`${host}${matchResult[0]}`, {
      headers: {
        Cookie: cookie
      }
    })
    const result = await parseString(res.data)
    const data = result.root;
    await updateCourse({ data, name: chapter.name, time: chapter.time })
  } else {
    console.log(chapter.name, '观看失败')
  }
}

async function start(cookie, rl) {
  try {
    global.cookie = cookie
    global.rl = rl
    const list = await fetchCourse()
    for await (const item of list) {
      await fetchChapter(item)
    }
  } catch (e) {
    console.log('登录失败')
    process.exit(-1)
  }
}

module.exports = start;