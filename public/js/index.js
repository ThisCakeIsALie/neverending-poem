const MAX_PARAGRAPH_LENGTH = 200;

const socket = io();

const genPrefix = (poem, paragraph) => Buffer.from([...poem, paragraph].join(''), 'hex');

const proofWorker = new Worker('js/proofWorker.browser.js');

const proofWork = async (poem, paragraph) => new Promise(resolve => {
    proofWorker.onmessage = e => resolve(e.data);
    proofWorker.postMessage({
        poem,
        paragraph
    });
});

const paragraphInfo = {
    props: ['time', 'info-placement'],
    name: 'paragraph-info',
    computed: {
        timeInfo: function() {
            const dateOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric'
            };

            const date = new Date(this.time);

            return date.toLocaleDateString('en-US', dateOptions);
        },
        infoLeft: function() {
            return this.infoPlacement === 'left';
        }
    },
    template: `
        <div :class="['paragraph-info-container', { 'order-left': infoLeft }]">
            <div :class="['vertical-line', infoLeft ? 'center-line-from-right' : 'center-line-from-left']"></div>
            <span class="time-info">{{timeInfo}}</span>
        </div>
    `
};

const paragraphText = {
    name: 'paragraph-text',
    template: `
        <div class="paragraph-text">
            <slot></slot>
        </div>
    `
}

const paragraphInput = {
    name: 'paragraph-input',
    props: ['submitting'],
    data: function() {
        return {
            newParagraph: '',
            originalTextHeight: 0
        };
    },
    computed: {
        paragraphValid: function() {
            const validText = 0 < this.newParagraph.length && this.newParagraph.length < MAX_PARAGRAPH_LENGTH;

            return validText;
        }
    },
    mounted: function() {
        this.initTextArea();
    },
    watch: {
        newParagraph: function(paragraph) {
            this.resizeTextareaToFit();
        }
    },
    methods: {
        propose() {
            this.$emit('propose', this.newParagraph);
            this.newParagraph = '';
        },
        initTextArea() {
            this.originalTextHeight = this.$refs.textarea.scrollHeight;
            this.$nextTick(() => this.resizeTextareaToFit());
        },
        resizeTextareaToFit() {
            this.$refs.textarea.style.height = 'auto';
            this.$refs.textarea.style.height = Math.max(this.$refs.textarea.scrollHeight, this.originalTextHeight) + 10 + 'px';
        }
    },
    template: `
        <fieldset>
            <textarea
                ref="textarea"
                class="text-input-field"
                placeholder="This is a poem written by everyone together. Everything you add can be seen by everybody. Have fun but please be responsible :) To get started type here..."
                type="text"
                v-model="newParagraph"
                :disabled="submitting"
            ></textarea>
            <button class="paragraph-button" @click="propose()" :disabled="!paragraphValid || submitting">
                <span v-if="!submitting">Propose paragraph</span>
                <span v-else><i class="fa fa-circle-o-notch fa-spin"></i> Submitting</span>
            </button>
            <p class="error" v-if="newParagraph.length> ${MAX_PARAGRAPH_LENGTH}">
                Your paragraph cannot be longer than ${MAX_PARAGRAPH_LENGTH} characters!
            </p>
        </fieldset>
    `
};

const { PacmanLoader } = window.VueSpinner;

const app = new Vue({
    el: '#root',
    data: {
        poem: [],
        submitting: false
    },
    components: {
        paragraphInfo,
        paragraphInput,
        PacmanLoader,
        paragraphText
    },
    mounted: function () {
        if (this.loadedInitial) {
            return;
        }

        socket.on('poem_updated', poem => {
            this.poem = poem;
        });

        // Once the poem loads for the first time scroll down
        socket.once('poem_updated', poem => {
            /*
            setTimeout(() => {
                this.$refs.paragraphInput.$el.scrollIntoView({
                    behavior: 'smooth'
                });
            }, 100);
            */
        });
    },
    methods: {
        async proposeParagraph(paragraph) {
            this.submitting = true;
            const proof = await proofWork(this.poem, paragraph);

            socket.emit('propose_paragraph', {
                paragraph, 
                proof
            });

            this.submitting = false;
        },
        scrollToContribute() {
            this.$refs.paragraphInput.$el.scrollIntoView({
                behavior: 'smooth'
            });
        },
        scrollToPoem(ref) {
            this.$refs.poem.$el.scrollIntoView({
                behavior: 'smooth'
            });
        }
    }
});