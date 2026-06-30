For this project, I want to built an generative ai workflow. You are my technical partner and you will be responsible from brainstorming to implementation and shipping of product from idea. This workflow should aim to be not just a toy, but a tool that can take up the responsibility of marketing team for a real and live product setting. 

# Goal
What i want to acheive is i want to create a end to end marketing asset generation workflow which will incorporate a generative ai like gemni or gpt and a image generative ai like nanobanan or gpt-image-2. 

The marketing assets can be used for Ads campaigns or social media content marketing. 

My initial thinking: 

the workflow will take in the product description (requried) and target audience (optional) as user input. 

then it will automatically analyse who is the target audience (if not provided in user input), what are their painpoints, what are the usecase, what are the scenarios. and create documentation. This doc should be persisted and stored for future reference, because user likely will use this tool for the same product multiple times. 

the ai will then generate ads or social media content marketing ideas, refer to the 'example_post_concept_skill.md'. 

the ai will determine if the marketing idea will be a single image or multi image carousel.

the ideas will then pass to the image generative ai model, to generate the required asset. the output will be single or multiple images.


# Must have
- traceability - able to inspect intermediate outputs
- easy to debug
- balanced token optimization and performance.

# Good to have
- feel free to suggest

# Not have
- automate the process of posting to social media. (i am still considering if the best approach is to make this a seperate process and integrate with this workflow into a bigger ochestration, because the posting action could require a cron job to run at specific time or scheduled.)

# What you need to do
- refine my initial plan, find loop holes, or things that ambiguous, find areas you think can flow better.
- draft the product PRD. 
- reasearch and choose the most suitable techstack.