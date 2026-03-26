package main

import (
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
)

func hash(label, value string) {
	hash, err := bcrypt.GenerateFromPassword([]byte(value), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("===================================")
	fmt.Println(label)
	fmt.Println("VALOR ORIGINAL:", value)
	fmt.Println("HASH:")
	fmt.Println(string(hash))
	fmt.Println("===================================")
}

func main() {
	// senha do supervisor
	hash("SENHA SUPERVISOR", "A657680s")

	// token fixo do supervisor (ESCOLHA UM FORTE)
	hash("TOKEN SUPERVISOR", "ERGUS_SUPERVISOR_TOKEN_01")
}
