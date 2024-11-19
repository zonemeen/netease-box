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

console.log('Environment Variables:')
console.log('GIST_ID:', gistId)
console.log('GH_TOKEN:', githubToken ? '***' : 'Not Set')
console.log('ACCOUNT_ID:', accountId)
console.log('SONG_TYPE:', type)

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
  try {
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

    console.log('Fetched data from NetEase:', data)

    const songs = data.weekData ?? data.allData
    if (!songs.length) {
      console.log('No songs found')
      return
    }

    const tracks = songs
      .slice(0, 5)
      .map(({ song }) => `[${song.name}] - ${song.ar.map(({ name }) => name).join('/')}`)
      .join('\n')

    console.log('Top 5 tracks:', tracks)

    const octokit = new Octokit({
      auth: `${githubToken}`,
    })
    const gist = await octokit.gists.get({
      gist_id: gistId,
    })

    const filename = Object.keys(gist.data.files)[0]
    async function updateGist(gistId, filename, tracks) {
      try {
        const response = await octokit.rest.gists.update({
          gist_id: gistId,
          files: {
            [filename]: {
              filename: `🎵 My NetEase Cloud Music Top Track`,
              content: tracks,
            },
          },
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        })
        console.log('Gist updated successfully:', response.data)
      } catch (error) {
        console.error('Error updating gist:', error)
      }
    }

    console.log('Gist updated successfully')
  } catch (error) {
    console.error('Unable to update gist', error)
  }
})()