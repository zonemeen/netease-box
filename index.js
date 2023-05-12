require('dotenv').config()
const axios = require('axios')
const crypto = require('crypto')
const { Octokit } = require('@octokit/rest')

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  ACCOUNT_ID: accountId,
  SONG_TYPE: type = 1,
} = process.env

const aesEncrypt = (secKey, text) => {
  const cipher = crypto.createCipheriv('AES-128-CBC', secKey, '0102030405060708')
  return cipher.update(text, 'utf-8', 'base64') + cipher.final('base64')
}

const aesRsaEncrypt = (text) => ({
  params: aesEncrypt('TA3YiYCfY2dDJQgg', aesEncrypt('0CoJUm6Qyw8W8jud', text)),
  encSecKey:
    '84ca47bca10bad09a6b04c5c927ef077d9b9f1e37098aa3eac6ea70eb59df0aa28b691b7e75e4f1f9831754919ea784c8f74fbfadf2898b0be17849fd656060162857830e241aba44991601f137624094c114ea8d17bce815b0cd4e5b8e2fbaba978c6d1d14dc3d1faf852bdd28818031ccdaaa13a6018e1024e2aae98844210',
})

;(async () => {
  const { data } = await axios.post(
    'https://music.163.com/weapi/v1/play/record?csrf_token=',
    aesRsaEncrypt(
      JSON.stringify({
        uid: accountId,
        type,
      })
    ),
    {
      headers: {
        Accept: '*/*',
        'Accept-Encoding': 'gzip,deflate,sdch',
        'Accept-Language': 'zh-CN,en-US;q=0.7,en;q=0.3',
        Connection: 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Host: 'music.163.com',
        Referer: 'https://music.163.com/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
        Cookie:
          'os=pc; osver=Microsoft-Windows-10-Professional-build-10586-64bit; appver=2.0.3.131777; ',
      },
    }
  )

  const songs = data.weekData ?? data.allData
  if (!songs.length) return

  const tracks = songs
    .slice(0, 5)
    .map(({ song }) => `[${song.name}]   -   ${song.ar.map(({ name }) => name).join('/')}`)
    .join('\n')

  try {
    const octokit = new Octokit({
      auth: `token ${githubToken}`,
    })
    const gist = await octokit.gists.get({
      gist_id: gistId,
    })

    const filename = Object.keys(gist.data.files)[0]
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: `🎵 My NetEase Cloud Music Top Track`,
          content: tracks,
        },
      },
    })
  } catch (error) {
    console.error(`Unable to update gist\n${error}`)
  }
})()
