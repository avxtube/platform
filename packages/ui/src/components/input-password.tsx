"use client"
import * as React from "react"

import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput
} from "./input-group"

import { EyeIcon, EyeOffIcon } from "lucide-react"

function InputPassword({ className, ...props }: React.ComponentProps<"input">) {
    const [type, setType] = React.useState("password")
    return (
        <InputGroup>
            <InputGroupInput
                className={className}
                {...props}
                type={type}
            />
            <InputGroupAddon align="inline-end">
                <InputGroupButton
                    className="rounded-full"
                    size="icon-xs"
                    onClick={() => { setType(type === "text" ? "password" : "text") }}
                >
                    {
                        type === "text" ? <EyeIcon /> : <EyeOffIcon />

                    }
                </InputGroupButton>
            </InputGroupAddon>
        </InputGroup>
    )
}

export { InputPassword }
