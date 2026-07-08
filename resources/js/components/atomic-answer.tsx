import React from 'react';

interface AtomicAnswerProps {
    question: string;
    answer: string;
    headingLevel?: 'h2' | 'h3';
}

export function AtomicAnswer({
    question,
    answer,
    headingLevel = 'h2',
}: AtomicAnswerProps) {
    const Heading = headingLevel;

    return (
        <div className="my-8">
            <Heading className="mb-2 text-xl font-semibold text-foreground">
                {question}
            </Heading>
            {/* The answer is strictly a single <p> tag with 40-60 words to optimize for Generative AI Answers */}
            <p className="leading-relaxed text-muted-foreground">{answer}</p>
        </div>
    );
}
