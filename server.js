const express = require('express')
const app = express()
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
app.use('/public', express.static('public'))
//이거 없으면 ejs에서 js호출 스크립트에서 오류남
app.use('/js', express.static('js'))

//로그인 관련 라이브러리
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')
app.use(session({ secret: '1234', resave: true, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())
//로그인 관련 라이브러리

const MongoClient = require('mongodb').MongoClient
var db
MongoClient.connect(
  'mongodb+srv://hashoco-board:Q0UxV52Uwq6zYCV0@cluster-board.hkzx3te.mongodb.net/?retryWrites=true&w=majority',
  { useUnifiedTopology: true },
  (err, client) => {
    if (err) return console.log(err)
    db = client.db('board')

    app.listen('8080', (req, res) => {
      console.log('listening on 8080')
      app.get('/', (req, res) => {
        res.render('login')
      })
    })
  },
)

app.get('/homepage', loginCfrm, (req, res) => {
  res.render('homepage.ejs', { user: req.user })
})


app.get('/calendar', (req, res) => {
  res.render('calendar.ejs', { user: req.user })
})

app.get('/fail', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.write("<script>alert('아아디 비밀번호를 확인해주세요.')</script>")
  res.write('<script>history.back(-1)</script>')
  res.end
})

app.get('/login', (req, res) => {
  res.render('login.ejs')
})

app.post(
  '/homepage',
  passport.authenticate('local', {
    failureRedirect: '/fail', //로그인 실패시 /fail 경로로 이동시켜주는 역할
  }),
  (req, res) => {
    console.log('log try...')

    res.redirect('homepage')
  },
)

app.post(
  '/regi',

  (req, res) => {
    // 비밀번호 비교 필요, 아이디 중복확인 필요. 및 알림창 띄우주기.(암호화는 나중에 생각..) 이름/연락처 정도 인풋란 추가 1,2,3일때 분기처리 필요
    //가입
    if (req.body.gubun == '1') {
      if (req.body.pw != req.body.pwchk) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.write("<script>alert('비밀번호가 일치 하지 않습니다.')</script>")
        res.write('<script>history.back(-1)</script>')
        res.end
      } else {
        db.collection('login').findOne({ id: req.body.id }, (err, result) => {
          if (result) {
            if (result.id == req.body.id) {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
              res.write("<script>alert('동일한 계정이 존재합니다.')</script>")
              res.write('<script>history.back(-1)</script>')
              res.end
            }
          } else {
            db.collection('login').insertOne(
              { id: req.body.id, pw: req.body.pw },
              (err, result) => {
                res.writeHead(200, {
                  'Content-Type': 'text/html; charset=utf-8',
                })
                res.write("<script>alert('등록처리 되었습니다.')</script>")
                res.write('<script>window.location="/"</script>')
                res.end
              },
            )
          }
        })
      }
      //로그인
    } else if (req.body.gubun == '3') {
      db.collection('login').findOne({ id: req.body.id }, (err, result) => {
        if (result) {
          db.collection('login').updateOne(
            { id: req.body.id },
            { $set: { pw: '1234' } },
            (err, result) => {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
              res.write("<script>alert('초기화 완료되었습니다.')</script>")
              //res.write('<script>window.location="/"</script>')
              res.write('<script>history.back(-1)</script>')
              res.end
            },
          )
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.write("<script>alert('아이디를 확인해주세요.')</script>")
          //res.write('<script>window.location="/"</script>')
          res.write('<script>history.back(-1)</script>')
          res.end
        }
      })
    }
  },
)

//authenticate 이걸로 로그인시만사용을 함.
passport.use(
  new LocalStrategy(
    {
      usernameField: 'id',
      passwordField: 'pw',
      session: true,
      passReqToCallback: true,
    },
    (req, usernameField, passwordField, done) => {
      if (req.body.gubun == '2') {
        db.collection('login').findOne(
          { id: usernameField, pw: passwordField },
          (err, result) => {
            //console.log(result)
            if (result) {
              return done(null, result)
            } else {
              return done(null, false, {
                message: '아이디 비밀번호를 확인해주세요.',
              })
            }
          },
        )
      } else if (req.body.gubun == '1') {
        db.collection('login').updateOne(
          { id: usernameField },
          { $set: { pw: '1234' } },
          (err, result) => {
            return done(null, result)
          },
        )
      }
    },
  ),
)

//id를 이용해서 세션을 저장시키는코드(로그인 성공시 발동)
passport.serializeUser((user, done) => {
  done(null, user.id)
})
//이 세션 데이터를 가진 사람을 DB에서 찾아주는 역할(마이페이지 접속시 발동)
passport.deserializeUser((아이디, done) => {
  //DB에서 user.id로 유저를 찾은 뒤에 유저정보를
  db.collection('login').findOne({ id: 아이디 }, (err, result) => {
    done(null, result)
  })
})

app.get('/mypage', loginCfrm, (req, res) => {
  //res.sendFile(__dirname + '/views/write.ejs')
  //console.log(req.body)
  res.render('mypage.ejs', { data: req.user })
})

function loginCfrm(req, res, next) {
  if (req.user) {
    //   console.log(res)
    next()
  } else {
    res.send('로그인이 되어있지 않습니다.')
  }
}

app.post('/profilemodify', (req, res) => {
  console.log(req.body)
  // console.log(res);

  db.collection('login').updateOne(
    { id: req.body.id },
    {
      $set: {
        birth: req.body.birth,
        nickname: req.body.nickname,
        profile: req.body.profile,
      },
    },
    (err, result) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.write("<script>alert('등록 완료되었습니다.')</script>")
      res.write('<script>history.back(-1)</script>')
      res.end
    },
  )
})

app.get('/write', (req, res) => {
  db.collection('post')
    .find()
    .toArray((err, result) => {
      console.log(result)
      res.render('write.ejs', { posts: result , user: req.user })
      
    })
})

app.delete('/delete', (req, res) => {
  req.body._id = parseInt(req.body._id)
  //console.log(req.body._id)
  //var deleteContents = {_id: req.body._id, regiid: req.user._id} ;
  var deleteContents = { _id: req.body._id }

  db.collection('post').deleteOne(deleteContents, (err, result) => {
    //console.log(result);
    if (err) {
      console.log('실패했습니다.')
    }
    res.status(200).send({ message: '성공했습니다.' })
  })
})

app.get('/search', (req, res) => {
  // console.log(req.query.value);
  //정확히 일치하는것만 찾아줌
  //db.collection('post').find({title :req.query.value }).toArray((err,result)=>{
  var searchValue = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: req.query.value,
          path: 'title', // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        },
      },
    },
    { $sort: { _id: 1 } }, //1오름차순 -1 내림차순
  ]
  db.collection('post')
    .aggregate(searchValue)
    .toArray((err, result) => {
      
      if (result) {
        res.render('listSearch.ejs', { posts: result , user: req.user })
      } 
    })
})




app.post('/boardmodify', (req, res) => {
  console.log('req.body.modalid='+ req.body.modalid);
  if(req.body.modalid){
    db.collection('post').updateOne(
      { _id: parseInt(req.body.modalid)  },
      {
        $set: {
          title: req.body.modaltitle,
          contents: req.body.modalcontent,
        },
      },
      (err, result) => {
     
        db.collection('post')
        .find()
        .toArray((err, result) => {
          res.render('write.ejs', { posts: result  , user: req.user })
        })      
      },
    )
  }else{

  db.collection('post_counter').findOne({ name: '게시물수' }, (err, result) => {
    var totalcountId = result.totalcount

    var saveCotents = {
      _id: totalcountId + 1,
      title: req.body.modaltitle,
      contents: req.body.modalcontent,
      regiid: req.body.modalregiid,
    }
    db.collection('post').insertOne(saveCotents, (err, client) => {
      console.log('저장완료')
      //set연산차는 값을 바꿔달라는 의미 업데이트시 사용  inc를 쓰면 증가의미
      db.collection('post_counter').updateOne(
        { name: '게시물수' },
        { $inc: { totalcount: 1 } },
        (err, result) => {
          if (err) return console.log(err)
          db.collection('post')
          .find()
          .toArray((err, result) => {
            res.render('write.ejs', { posts: result, user: req.user })
          })   
        },
      )
    })
  })
  }
  
})

