<template>
  <div
    v-if="isVisible"
    class="modal"
  >
    <div class="modal-content">
      <span
        class="close"
        @click="close"
      >&times;</span>
      <form @submit.prevent="handleSubmit">
        <label for="email">User Email:</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
        >

        <label for="password">User Password:</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
        >

        <button type="submit">
          Update
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'

  // Visibility is controlled by Header; without declaring it as a prop the modal
  // could never open, and `emit` was previously undefined so closing threw.
  defineProps({
    isVisible: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['update'])

  const email = ref('')
  const password = ref('')

  const handleSubmit = () => {
    // Implement the logic to update the user's email and password
    emit('update')
  }

  const close = () => {
    emit('update')
  }
</script>

<style scoped>
  .modal {
    display: block;
    position: fixed;
    z-index: 1002;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0, 0, 0, 0.4);
    border-radius: 10px;
  }

  .modal-content {
    background-color: #ffffff;
    margin: 15% auto;
    padding: 20px;
    border: 1px solid #888;
    width: 50%;
    font-family: 'Arial', sans-serif;
    color: #333;
    border-radius: 10px;
    position: relative;
  }

  .mode-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
  }

  .role-selection,
  .form-actions {
    margin-top: 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  select {
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
  }

  button {
    background-color: rgb(161, 161, 161);
    color: rgb(255, 255, 255);
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    margin: 0px 5px 10px;
    cursor: pointer;
    min-width: 100px;
    transition: background-color 0.3s ease;
  }

  button:hover {
    background-color: rgb(109, 109, 109);
  }

  .close {
    color: #aaa;
    position: absolute;
    top: 10px;
    right: 20px;
    float: right;
    font-size: 28px;
    font-weight: bold;
  }

  .close:hover,
  .close:focus {
    color: black;
    text-decoration: none;
    cursor: pointer;
  }

  input[type='email'],
  input[type='password'] {
    width: 100%;
    padding: 12px 20px;
    margin: 8px 0;
    display: inline-block;
    border: 1px solid #ccc;
    box-sizing: border-box;
    border-radius: 5px;
  }
</style>
