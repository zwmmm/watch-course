const FormData = require('form-data');
const axios  = require('axios');
const cheerio = require('cheerio');
const { parseString } = require('xml2js');

const host = 'http://pt3.cjnep.net';

const homeURL = `${host}/lmsv1/course`;


/**
 * 创建formData
 * @param obj
 */
function genFormData(obj) {
  const formData = new FormData();
  formData.append('courseId', obj.courseId);
  formData.append('scoId', obj.scoId);
  formData.append('historyId', obj.historyId);
  formData.append('addTime', obj.time);
  formData.append('totalTime', obj.time);
  formData.append('currentTime', obj.time);
  return formData;
}


/**
 * 更新课程
 * @param formData
 */
function updateCourse(data) {
  return axios.post(
    `${host}/lmsv1/course/updstatus`,
    data.formData,
    {
      headers: {
        ...data.formData.getHeaders(),
        Cookie: cookie,
        'Content-Length': data.formData.getLengthSync(),
      },
    }
  ).then(res => {
    parseString(res.data, (err, obj) => {
      if (err) return;
      if (obj.root.status[0] == 1) {
        console.log(data.name, '观看成功')
      } else {
        console.log(data.name, '观看失败')
      }
    })
  }).catch(err => console.log(err.message))
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
    const $ = cheerio.load(res.data);
    const courseList = $('.clist .base_content .base_detail_title a');
    const href = [];

    courseList.each(function () {
      const item = $(this);
      href.push(item.attr('href'));
    });

    return href;
  }).catch(() => {
    console.log('用户信息错误');
  })
}

/**
 * 获取章节
 */
function fetchChapter(list) {

  function watch() {
    const href = list.shift();
    axios.get(`${host}${href}`, {
      headers: {
        Cookie: cookie
      }
    }).then(res => {
      const $ = cheerio.load(res.data);
      const courseList = $('.course_num_div.panel a');
      const chapter = [];

      courseList.each(function () {
        const item = $(this);
        chapter.push({ href: item.attr('href'), name: item.find('.scolor2').text() });
      });

      return chapter;
    }).then(getCourseInfo).then(() => {
      if (list.length > 0) {
        watch()
      }
    })
  }

  watch()
}

/**
 * 获取课程信息
 */
function getCourseInfo(chapterList) {

  return new Promise(resolve => {

    function watch() {
      const chapter = chapterList.shift();
      axios.get(`${host}${chapter.href}`, {
        headers: {
          Cookie: cookie
        }
      }).then(res => {
        const regExp = /\/lmsv1\/course\/startupxml\/courseid\/[0-9]+\/itemid\/[0-9]+\/historyid\/([0-9]+)/;
        const matchResult = res.data.match(regExp);
        if (matchResult) {
          axios.get(`${host}${matchResult[0]}`).then(res => parseString(res.data, function (err, result) {
            if (err) return;
            const data = result.root;
            const formData = genFormData({
              courseId: data.courseId[0],
              scoId: data.scoId[0],
              historyId: data.historyId[0],
              time: 10000,
            });
            updateCourse({ formData, name: chapter.name }).then(() => {
              if (chapterList.length > 0) {
                watch()
              } else {
                resolve();
              }
            })
          }))
        }
      })
    }

    watch()
  })
}

function start(cookie) {
  global.cookie = cookie;
  fetchCourse().then(fetchChapter)
}

module.exports = start;