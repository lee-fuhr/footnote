<!-- mined-hashes: 0ec517ee1f8a1e6e4ec151bef12a1243,10a93367fc4490394ee9401b221503ea,192123eb09cf04562745da3d545100f4,22c304a71e59fe135c8840c2922cf1e0,2b8aaa40abc93cfae092c7ca8093fc1d,30da04c1a0040cb58d4eeb80483c18e6,6c36a8496da536defd5f91a919808afc,abc35ef0a514abcc5a21d5c222cab4a2,ba72a0f9e9c474bd494fb23a39a21ede,c5d81211da490401b47332dfa14f4593,d8dfc9026d45e1ab7c02e5a6fb686fb8,ded215811c8cc5b136e8106001ea37cc,f4dc9a4f93291be24e6e026580c15e65,f7e901d5f5ac5a907610b0f4bd21d9d0,f9d4a3597d64bcb94f4e74b04e5b1471 -->

# Footnote evolution log

Single source of truth for product asks mined from walks.

## NEEDS_LEE_JUDGMENT

- [✅❓] **Reduce transcription latency**
  - *"the period after I speak before my words show up in the transcript takes quite a few seconds"*
  - Decrease the delay between speaking and seeing words appear in the transcript.
  <!-- id:46893097b393 | walk:walk-1b24e513-d5f5-4b3e-b650-f2f0a359d206.md | hash:10a93367fc4490394ee9401b221503ea | vote_models:cerebras+deepseek | reasoning_groq:[Cerebras HTTP error: 429 {"message":"We're experiencing high traffic right now! Please try again soon.","type":"too_many_requests_error","param":"queue","code":"queue_exceeded"}] | reasoning_gemini:Reducing transcription latency directly improves the core voice-input experience of a walk-thinking notes app, fitting its purpose without scope creep or contradiction. -->

- [✅❓] **Improve UX when ending a walk**
  - *"What I assumed would end the previous walk or the previous footnote on this walk . It seems to kind of just fart out and unstyled edge to edge"*
  - The left arrow button ends the walk unexpectedly, showing an unstyled text-only transcript with unclear pills and non-functional swipe gestures.
  <!-- id:87cf51c4f7b4 | walk:walk-85bc5aa6-31ac-445a-b39c-554a129691e0.md | hash:2b8aaa40abc93cfae092c7ca8093fc1d | vote_models:cerebras+deepseek | reasoning_groq:[Cerebras HTTP error: 429 {"message":"Requests per minute limit exceeded - too many requests sent.","type":"too_many_requests_error","param":"quota","code":"request_quota_exceeded"}] | reasoning_gemini:This directly improves the core walk-ending flow of the app, addressing clarity and functionality of the transcript view, which aligns with the product's purpose of capturing stream-of-consciousness… -->

- [✅❓] **Clarify purpose of 'done' and 'keep' pills**
  - *"there's a tiny pair of pills I think? Or done and keep and I have no idea what these are for"*
  - Two small pills labeled 'done' and 'keep' appear below the transcript after ending a walk, but their function is unknown.
  <!-- id:9adf1aa69132 | walk:walk-85bc5aa6-31ac-445a-b39c-554a129691e0.md | hash:2b8aaa40abc93cfae092c7ca8093fc1d | vote_models:cerebras+deepseek | reasoning_groq:[Cerebras HTTP error: 429 {"message":"Requests per minute limit exceeded - too many requests sent.","type":"too_many_requests_error","param":"quota","code":"request_quota_exceeded"}] | reasoning_gemini:Clarifying the function of UI elements directly improves user experience for walk-thinking notes, aligning with the app's purpose without introducing scope creep, social features, or duplicates. -->

- [✅❓] **Fix layout break when typing a period**
  - *"Oof I just hit twice to add a period to test of typing worked and the whole layout broke"*
  - Tapping twice to add a period while testing typing caused the entire layout to break.
  <!-- id:0bca435bc379 | walk:walk-85bc5aa6-31ac-445a-b39c-554a129691e0.md | hash:2b8aaa40abc93cfae092c7ca8093fc1d | vote_models:cerebras+deepseek | reasoning_groq:[Cerebras HTTP error: 429 {"message":"We're experiencing high traffic right now! Please try again soon.","type":"too_many_requests_error","param":"queue","code":"queue_exceeded"}] | reasoning_gemini:Fixing a layout break when typing a period is a legitimate bug fix that directly improves the core typing functionality for capturing stream-of-consciousness notes, fitting the app's purpose without… -->

- [✅❓] **Lock transcript to bottom when entering talking mode**
  - *"transcript is not locked to the bottom Of the screen. Boy I would love this transcription to work as well as Willow . But again this feels like a big UX win that when I tap into Taking mode I'm locked in and I can just start talking or typing"*
  - When tapping into talking mode, the transcript should be locked to the bottom of the screen to allow seamless talking or typing.
  <!-- id:d42f051017e3 | walk:walk-85bc5aa6-31ac-445a-b39c-554a129691e0.md | hash:2b8aaa40abc93cfae092c7ca8093fc1d | vote_models:cerebras+deepseek | reasoning_groq:[Cerebras HTTP error: 429 {"message":"Requests per minute limit exceeded - too many requests sent.","type":"too_many_requests_error","param":"quota","code":"request_quota_exceeded"}] | reasoning_gemini:Locking the transcript to the bottom during talking mode improves the user experience for seamless voice and typing input, directly supporting the app's core purpose of capturing stream-of-consciousn… -->

- [✅❌] **Separate microphone and speaker control for dictation**
  - *"I'm trying to play my podcast while also being able to dictate and it wasn't working."*
  - Allow the microphone to stay active for dictation while the speaker plays audio (e.g., podcast), without requiring manual toggling of the keyboard dictation button.
  <!-- id:ed7bec534472 | walk:walk-5ada40af-3f25-4eed-bb44-8d415061ca84.md | hash:ded215811c8cc5b136e8106001ea37cc | vote_models:groq+deepseek | reasoning_groq:The product ask allows for simultaneous audio playback and dictation, which fits the app's purpose of capturing stream-of-consciousness thoughts during walks. | reasoning_gemini:This request duplicates the existing queued evolution item 'Allow simultaneous audio playback' which already covers enabling audio playback while using dictation. -->

- [✅❓] **Clarify purpose of the checkmark button during dictation**
  - *"I'm gonna try hitting the checkmark Keyboard but I don't really even know what that's supposed to do"*
  - The user is unsure what the checkmark button on the keyboard does when in dictation mode, so it should be labeled or have a tooltip.
  <!-- id:ab6308150c3c | walk:walk-0e539275-4286-4e5e-83fc-9c80cfe312a1.md | hash:abc35ef0a514abcc5a21d5c222cab4a2 | vote_models:cerebras+deepseek | reasoning_groq:[Cerebras HTTP error: 429 {"message":"We're experiencing high traffic right now! Please try again soon.","type":"too_many_requests_error","param":"queue","code":"queue_exceeded"}] | reasoning_gemini:Clarifying the checkmark button's purpose during dictation improves UX clarity for the note-taking flow without introducing scope creep or contradicting the product's intent. -->

## NEEDS_LEE_RETRY

## PROPOSED

## QUEUED

- [✅✅] **Start walk with keyboard open**
  - *"When I start a new walk, why should I have to tap in the continue field? I'm here to start a walk. Why can't we start with the keyboard open?"*
  - When starting a new walk, the user wants the keyboard to open automatically instead of having to tap the continue field, and ideally Siri/dictation should be available at start.
  <!-- id:072b767f38a4 | walk:walk-c024de7c-recovery.md | hash:30da04c1a0040cb58d4eeb80483c18e6 | vote_models:groq+gemini | reasoning_groq:The request is a clear improvement to the user experience of starting a new walk, fitting the purpose of capturing stream-of-consciousness thoughts during walks, and does not contradict the product's… | reasoning_gemini:Reduces friction in the core capture workflow by allowing immediate entry of thoughts via keyboard or dictation upon starting a walk, which aligns perfectly with the app's purpose as a walk-thinking… -->

- [✅✅] **Pulsating dot tooltip**
  - *"What is that pulsating dot in the lower right corner? It's not clear and it should be clear, and it should be tappable to shove a little tool tip to explain what it is or give more information."*
  - The pulsating dot in the lower right corner is unclear and should have a tappable tooltip for explanation.
  <!-- id:d4a0de5c04c7 | walk:walk-c024de7c-recovery.md | hash:30da04c1a0040cb58d4eeb80483c18e6 | vote_models:groq+gemini | reasoning_groq:Adding a tooltip to the pulsating dot for clarity enhances the user experience and fits within the app's purpose of facilitating walk-thinking notes. | reasoning_gemini:Improving the clarity of core UI elements like the pulsating recording/status indicator through a tooltip is a direct UX improvement that helps users understand the app's state during walks. -->

- [✅✅] **Show east/west in latitude indicator**
  - *"I like the little live indicator with the precise latitude but right now I'm only seeing 32.791° north. What about East West?"*
  - The live latitude indicator only shows north; it should also show east/west for completeness.
  <!-- id:9fa0bb48cd84 | walk:walk-c024de7c-recovery.md | hash:30da04c1a0040cb58d4eeb80483c18e6 | vote_models:groq+gemini | reasoning_groq:The request to show east/west in the latitude indicator is a clear product improvement that fits the app's purpose of capturing and displaying location-based information during walks. | reasoning_gemini:The request improves the completeness of the GPS status display, which is a core feature for GPS-stamped walk notes. While technically referring to longitude, the intent to show full coordinates fits… -->

- [✅✅] **Clarify two pulsating dots in footer**
  - *"And why do we have two pulsating dots in the foot to? They indicate something different?"*
  - The user wonders why there are two pulsating dots in the footer and what they indicate differently.
  <!-- id:42c23702b32e | walk:walk-c024de7c-recovery.md | hash:30da04c1a0040cb58d4eeb80483c18e6 | vote_models:groq+gemini | reasoning_groq:The request is about clarifying the meaning of existing UI elements, which is within the scope of improving the user experience of the walk-thinking notes app. | reasoning_gemini:Clarifying existing UI indicators is a legitimate usability improvement that helps users understand the app's state during a walk without introducing scope creep or conflicting with the product's cor… -->

- [✅✅] **Allow simultaneous audio playback**
  - *"it seems like I can't also play any audio into my ears while this is going?"*
  - Enable playing audio (e.g., podcast) while using the audio-only mode.
  <!-- id:5e21bcb0ddad | walk:walk-1b24e513-d5f5-4b3e-b650-f2f0a359d206.md | hash:10a93367fc4490394ee9401b221503ea | vote_models:groq+deepseek | reasoning_groq:allowing simultaneous audio playback fits the app's purpose of capturing stream-of-consciousness thoughts during walks and does not contradict the product's intent | reasoning_gemini:This request enhances the audio-only recording experience by allowing users to listen to a podcast or other audio simultaneously, which fits the app's purpose of capturing thoughts during walks witho… -->

- [✅✅] **Prioritize current walk transcript on screen**
  - *"the transcript from this call is taking up just a tiny Can I see two items but I can see the bulk of the screen like 80 or 90% of it is showing my previous walk which I have which I just don't need to see right now."*
  - Show the current walk transcript prominently and hide previous walks from the main view.
  <!-- id:9836206593a3 | walk:walk-1b24e513-d5f5-4b3e-b650-f2f0a359d206.md | hash:10a93367fc4490394ee9401b221503ea | vote_models:groq+deepseek | reasoning_groq:The request to prioritize the current walk transcript on screen aligns with the app's purpose of facilitating walk-thinking notes and does not duplicate any existing evolution items. | reasoning_gemini:This request directly improves the core walk-thinking experience by focusing on the current walk transcript, aligning with the app's purpose of capturing stream-of-consciousness thoughts without dist… -->

- [✅✅] **Fix overlapping indicators in bottom right corner**
  - *"the insights indicator is completely overlapping with what I think is a serious indicator. Siri indicator."*
  - Prevent the insights indicator from overlapping with the Siri indicator.
  <!-- id:538a580306cc | walk:walk-1b24e513-d5f5-4b3e-b650-f2f0a359d206.md | hash:10a93367fc4490394ee9401b221503ea | vote_models:groq+deepseek | reasoning_groq:The request is to fix overlapping indicators in the bottom right corner, which is a UI improvement that fits the app's purpose of enhancing the user experience during walk-thinking notes. | reasoning_gemini:Fixing overlapping UI indicators directly improves usability and clarity without scope creep, duplicate, or contradiction of app intent. -->

- [✅✅] **Fix non-functional settings button for local folder**
  - *"in settings that choose button for the local folder isn't doing anything"*
  - Make the 'choose button for the local folder' in settings actually work.
  <!-- id:0ee00cc8fb68 | walk:walk-1b24e513-d5f5-4b3e-b650-f2f0a359d206.md | hash:10a93367fc4490394ee9401b221503ea | vote_models:groq+deepseek | reasoning_groq:The request to fix the non-functional settings button for the local folder is a clear product improvement that fits the app's purpose of allowing users to capture and manage their walk-thinking notes… | reasoning_gemini:Fixing a non-functional settings button is a clear product improvement that directly enhances the app's purpose of managing local folder storage for walk notes, and is neither scope creep nor a dupli… -->

- [✅✅] **Change button capitalization to sentence case**
  - *"sentence case our buttons . Lowercase is just juvenile."*
  - Use sentence case for buttons instead of lowercase, which feels juvenile.
  <!-- id:b80635a4ac1a | walk:walk-1b24e513-d5f5-4b3e-b650-f2f0a359d206.md | hash:10a93367fc4490394ee9401b221503ea | vote_models:groq+deepseek | reasoning_groq:Changing button capitalization to sentence case improves the product's UI and does not contradict its purpose or introduce scope creep. | reasoning_gemini:This is a clear UI improvement (sentence case for buttons) that enhances readability and maturity without introducing new features, duplicating existing items, or contradicting the app's purpose. -->

- [✅✅] **Provide clear dictation feedback and prevent scrolling**
  - *"I've got that little indicator that says dictating but I'm not seeing my workshop at all"*
  - When dictating in a walk, the user sees a dictation indicator but no transcribed words appear, and the app may scroll, causing confusion about whether dictation is active and where focus is.
  <!-- id:61d4ace941f2 | walk:walk-0e539275-4286-4e5e-83fc-9c80cfe312a1.md | hash:abc35ef0a514abcc5a21d5c222cab4a2 | vote_models:groq+deepseek | reasoning_groq:The request is to provide clear dictation feedback and prevent scrolling, which directly relates to enhancing the walk-thinking notes experience, particularly during dictation, and does not introduce… | reasoning_gemini:Improves dictation clarity and prevents disorienting scrolling, directly enhancing the core capture experience without conflicting with the app's purpose or duplicating existing evolution items. -->

## IN_FLIGHT

## SHIPPED

## ARCHIVED

- [❓❓] **(no product asks) walk-test-001.md**
  - miner returned zero product asks for this walk
  <!-- id:481d3d01c0e7 | walk:walk-test-001.md | hash:0ec517ee1f8a1e6e4ec151bef12a1243 | vote_models:?+? | reasoning_groq: | reasoning_gemini: -->

- [❓❓] **(no product asks) walk-c024de7c-0eb0-4034-bbb6-ee8a03211ca3.md**
  - miner returned zero product asks for this walk
  <!-- id:a3058f1131e1 | walk:walk-c024de7c-0eb0-4034-bbb6-ee8a03211ca3.md | hash:d8dfc9026d45e1ab7c02e5a6fb686fb8 | vote_models:?+? | reasoning_groq: | reasoning_gemini: -->

- [❓❓] **(no product asks) walk-5d7b7f83-4cbe-4f0e-be02-13bb9f6cb9c3.md**
  - miner returned zero product asks for this walk
  <!-- id:e7ae1a72466f | walk:walk-5d7b7f83-4cbe-4f0e-be02-13bb9f6cb9c3.md | hash:192123eb09cf04562745da3d545100f4 | vote_models:?+? | reasoning_groq: | reasoning_gemini: -->

- [❓❓] **(no product asks) walk-5d7b7f83-4cbe-4f0e-be02-13bb9f6cb9c3.md**
  - miner returned zero product asks for this walk
  <!-- id:10096b52b9ea | walk:walk-5d7b7f83-4cbe-4f0e-be02-13bb9f6cb9c3.md | hash:f4dc9a4f93291be24e6e026580c15e65 | vote_models:?+? | reasoning_groq: | reasoning_gemini: -->

- [❓❓] **(no product asks) walk-5d7b7f83-4cbe-4f0e-be02-13bb9f6cb9c3.md**
  - miner returned zero product asks for this walk
  <!-- id:40a62fcaccda | walk:walk-5d7b7f83-4cbe-4f0e-be02-13bb9f6cb9c3.md | hash:c5d81211da490401b47332dfa14f4593 | vote_models:?+? | reasoning_groq: | reasoning_gemini: -->

- [❓❓] **(no product asks) walk-8dde6ea2-960a-4ce8-8087-b04c1311e340.md**
  - miner returned zero product asks for this walk
  <!-- id:aa98bb718e6f | walk:walk-8dde6ea2-960a-4ce8-8087-b04c1311e340.md | hash:f9d4a3597d64bcb94f4e74b04e5b1471 | vote_models:?+? | reasoning_groq: | reasoning_gemini: -->

- [❓❓] **(no product asks) walk-e5b3f108-b325-4c13-93e4-ea216f1e1cef.md**
  - miner returned zero product asks for this walk
  <!-- id:a4b9dffe64ca | walk:walk-e5b3f108-b325-4c13-93e4-ea216f1e1cef.md | hash:22c304a71e59fe135c8840c2922cf1e0 | vote_models:?+? | reasoning_groq: | reasoning_gemini: -->

- [❓❓] **(no product asks) walk-c112e24e-292f-47f6-9489-6485a72e3dfb.md**
  - miner returned zero product asks for this walk
  <!-- id:6b95f2b6a17f | walk:walk-c112e24e-292f-47f6-9489-6485a72e3dfb.md | hash:ba72a0f9e9c474bd494fb23a39a21ede | vote_models:?+? | reasoning_groq: | reasoning_gemini: -->

- [❓❓] **(no product asks) walk-18425dff-745f-4631-b6bd-06ac35bff48e.md**
  - miner returned zero product asks for this walk
  <!-- id:290a11bf9a5c | walk:walk-18425dff-745f-4631-b6bd-06ac35bff48e.md | hash:f7e901d5f5ac5a907610b0f4bd21d9d0 | vote_models:?+? | reasoning_groq: | reasoning_gemini: -->
