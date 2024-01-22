<script setup lang="ts">
import {ref, watch, onMounted, App} from 'vue'
import {sendToBackground, sendToContentScript} from "@plasmohq/messaging";
import { post as postApi } from '~components/fetch'
import RecordRTC from 'recordrtc'


const action = async () => {
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
  }).then(async function(stream) {
    console.log('then----stream', stream)
      let recorder = RecordRTC(stream, {
          type: 'video'
      });
      recorder.startRecording();

      const sleep = m => new Promise(r => setTimeout(r, m));
      await sleep(3000);

      recorder.stopRecording(function() {
          let blob = recorder.getBlob();
          console.log('视频流', blob)
          // invokeSaveAsDialog(blob);
      });
  }).catch(err => {
    console.log('捕获异常', err)
  })
  // const resp = await sendToBackground({
  //   name: "receive",
  //   body: {
  //     id: 123
  //   }
  // })

  // console.log('sendToBackground', resp);
}

// const queryTaskList = async () => {
//     try{
//         const res = await postApi('/task/list', { current: 1 })
//         console.log('queryTaskList', res)
//     } catch(error) {
        
//     }
// }
// queryTaskList()

onMounted(() => {

})

defineOptions({
  prepare(app: App) {
    // Use any plugins here:
    // app.use
  }
})
</script>

<template>
  <main>
    <h3>Popup Page</h3>

    <div class="calc">
      <button @click="action">Action</button>
    </div>
  </main>
</template>

<style>
:root {
  width: 375px;
  height: 540px;
  top: 6055px;
  left: -3496px;
  border-radius: 16px;
}

@media (prefers-color-scheme: light) {
  :root {
    background-color: #fafafa;
  }

  a:hover {
    color: #42b983;
  }
}

body {
  border-radius: 16px;
  min-width: 20rem;
  color-scheme: light dark;
}

main {
  text-align: center;
  padding: 1em;
  margin: 0 auto;
}

h3 {
  color: #42b983;
  text-transform: uppercase;
  font-size: 1.5rem;
  font-weight: 200;
  line-height: 1.2rem;
  margin: 2rem auto;
}

.calc {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 2rem;

  > button {
    font-size: 1rem;
    padding: 0.5rem 1rem;
    border: 1px solid #42b983;
    border-radius: 0.25rem;
    background-color: transparent;
    color: #42b983;
    cursor: pointer;
    outline: none;

    width: 6rem;
    margin: 0 a;
  }

  > label {
    font-size: 1.5rem;
    margin: 0 1rem;
  }
}

a {
  font-size: 0.5rem;
  margin: 0.5rem;
  color: #cccccc;
  text-decoration: none;
}
</style>
